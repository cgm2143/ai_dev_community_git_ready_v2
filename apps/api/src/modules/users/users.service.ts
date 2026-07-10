import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StorageService } from '../../infra/storage/storage.service';
import { ImageService } from '../../infra/image/image.service';
import { PasswordService } from '../auth/services/password.service';
import { BlockService } from '../blocks/block.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { validateImageUpload } from '../../common/utils/image-validation.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileImageUrlService } from './services/profile-image-url.service';
import { ProfileImageCleanupService } from './services/profile-image-cleanup.service';

const PROFILE_IMAGE_MAIN_DIMENSION = 1024;
const PROFILE_IMAGE_THUMBNAIL_DIMENSION = 256;

interface UploadedFileLike {
  size: number;
  mimetype: string;
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly imageService: ImageService,
    private readonly profileImageUrlService: ProfileImageUrlService,
    private readonly profileImageCleanupService: ProfileImageCleanupService,
    private readonly passwordService: PasswordService,
    private readonly blockService: BlockService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async getMe(userId: string) {
    const user = await this.findActiveUserOrThrow(userId);
    return this.toMyProfile(user);
  }

  async getPublicProfile(nickname: string) {
    const user = await this.prisma.user.findUnique({ where: { nickname } });

    // 탈퇴(익명화)된 계정은 존재 자체가 노출되지 않도록 일반 404와 동일하게 처리한다.
    if (!user || user.status === UserStatus.WITHDRAWN) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    return {
      nickname: user.nickname,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.findActiveUserOrThrow(userId);

    if (dto.nickname) {
      const existing = await this.prisma.user.findUnique({ where: { nickname: dto.nickname } });
      if (existing && existing.id !== userId) {
        throw new AppException(ErrorCode.NICKNAME_ALREADY_EXISTS);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
      },
      include: { role: true },
    });

    return this.toMyProfile(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findActiveUserOrThrow(userId);

    if (!user.passwordHash || !(await this.passwordService.compare(dto.currentPassword, user.passwordHash))) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, '현재 비밀번호가 일치하지 않습니다.');
    }

    const newPasswordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newPasswordHash } }),
      // 비밀번호가 변경되었으므로 현재 세션을 제외한 나머지 기기도 안전을 위해 모두 로그아웃 처리한다.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.info({ userId }, '비밀번호가 변경되어 모든 세션이 종료되었습니다.');
  }

  /**
   * 프로필 이미지 업로드 파이프라인:
   * 1) 크기(5MB)/MIME/확장자/실제 바이트 시그니처 검증 (GIF, SVG는 시그니처 목록에 없어 자동 거부)
   * 2) EXIF 방향 보정 후 메타데이터 제거, 1024x1024 이하로 리사이즈 + WebP 변환 (원본)
   * 3) 256x256 WebP 썸네일 생성
   * 4) UUID 기반 파일명(ProfileImageUrlService가 명명 규칙을 전담)으로 두 결과물을 S3에 업로드
   * 5) 이전 이미지 정리는 ProfileImageCleanupService에 위임 (현재는 즉시 삭제, 향후 큐/트랜잭션 기반으로 교체 가능)
   */
  async uploadProfileImage(userId: string, file: UploadedFileLike) {
    const previousUser = await this.findActiveUserOrThrow(userId);

    validateImageUpload(file);

    const [main, thumbnail] = await Promise.all([
      this.imageService.toWebp(file.buffer, {
        width: PROFILE_IMAGE_MAIN_DIMENSION,
        height: PROFILE_IMAGE_MAIN_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
        quality: 85,
      }),
      this.imageService.toWebp(file.buffer, {
        width: PROFILE_IMAGE_THUMBNAIL_DIMENSION,
        height: PROFILE_IMAGE_THUMBNAIL_DIMENSION,
        fit: 'cover',
        quality: 80,
      }),
    ]);

    const { mainKey, thumbnailKey } = this.profileImageUrlService.generateKeys(userId);

    const [profileImageUrl] = await Promise.all([
      this.storageService.uploadBuffer(mainKey, main, 'image/webp'),
      this.storageService.uploadBuffer(thumbnailKey, thumbnail, 'image/webp'),
    ]);
    const profileThumbnailUrl = this.profileImageUrlService.resolveThumbnailUrlFromMainUrl(profileImageUrl);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      include: { role: true },
    });

    this.profileImageCleanupService.scheduleCleanup(userId, previousUser.profileImageUrl);

    return { ...this.toMyProfile(updated), profileThumbnailUrl };
  }

  /**
   * 회원 탈퇴 - 물리 삭제 대신 익명화 (6단계 DB 설계에서 확정한 정책).
   * - email/nickname: UNIQUE 제약을 유지하면서 식별 불가능한 값으로 치환
   * - passwordHash/emailVerifiedAt/lastLoginAt: null (로그인 및 인증 정보 완전 제거)
   * - refresh_tokens: 물리 삭제 (인증 정보이므로 완전 제거)
   * - posts/comments: 그대로 유지 (author_id 보존, 화면에는 "삭제된 회원"으로 표시)
   */
    async withdraw(userId: string, password?: string): Promise<void> {
    const user = await this.findActiveUserOrThrow(userId);

    if (user.passwordHash) {
      if (!password || !(await this.passwordService.compare(password, user.passwordHash))) {
        throw new AppException(ErrorCode.INVALID_CREDENTIALS, '비밀번호가 일치하지 않습니다.');
      }
    }

    const anonymizedSuffix = randomUUID().slice(0, 8);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.local`,
          passwordHash: null,
          nickname: `삭제된 회원-${anonymizedSuffix}`,
          profileImageUrl: null,
          bio: null,
          status: UserStatus.WITHDRAWN,
          emailVerifiedAt: null,
          lastLoginAt: null,
          anonymizedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.socialAccount.deleteMany({ where: { userId } }),
    ]);

    this.logger.info({ userId }, '회원 탈퇴(익명화)가 완료되었습니다.');
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.blockService.block(blockerId, blockedId);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.blockService.unblock(blockerId, blockedId);
  }

  async listBlockedUsers(blockerId: string) {
    return this.blockService.listBlockedUsers(blockerId);
  }

  private async findActiveUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || user.status === UserStatus.WITHDRAWN) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  private toMyProfile(user: {
    id: string;
    email: string;
    nickname: string;
    bio: string | null;
    profileImageUrl: string | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    role: { name: string };
  }) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
      role: user.role.name,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt,
    };
  }
}
