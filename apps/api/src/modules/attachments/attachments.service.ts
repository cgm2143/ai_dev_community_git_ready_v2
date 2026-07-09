import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StorageService } from '../../infra/storage/storage.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  RequestAttachmentUploadDto,
  ConfirmAttachmentDto,
  maxSizeForContentType,
} from './dto/attachment.dto';

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'text/plain': 'txt',
};

/**
 * 게시글 첨부파일/인라인 이미지 업로드. 프로필 이미지(2단계)와 달리 서버 사이드 가공이
 * 필요 없으므로(원본 그대로 저장), Presigned URL 직접 업로드 방식을 그대로 사용한다.
 *
 * 정책: 이미지는 최대 10MB, 그 외 일반 파일은 최대 20MB, 게시글당 최대 10개
 * (개수 제한은 CreatePostDto/UpdatePostDto의 @ArrayMaxSize(10)에서 1차로 강제된다).
 * 동영상은 초기 버전에서 지원하지 않는다 (허용 MIME 타입 목록에 video/*를 포함하지 않음).
 */
@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async requestUpload(userId: string, dto: RequestAttachmentUploadDto) {
    this.assertSizeWithinPolicy(dto.contentType, dto.fileSize);

    const extension = EXTENSION_BY_CONTENT_TYPE[dto.contentType] ?? 'bin';
    const key = `attachments/${userId}/${randomUUID()}.${extension}`;
    return this.storageService.createPresignedUploadUrl(key, dto.contentType);
  }

  async confirm(userId: string, dto: ConfirmAttachmentDto) {
    this.assertSizeWithinPolicy(dto.contentType, dto.fileSize);

    if (!dto.key.startsWith(`attachments/${userId}/`)) {
      throw new AppException(ErrorCode.FORBIDDEN, '본인이 발급받은 업로드만 등록할 수 있습니다.');
    }

    const fileUrl = this.storageService.buildPublicUrl(dto.key);
    const fileType = dto.contentType.startsWith('image/') ? 'image' : 'file';

    const attachment = await this.prisma.attachment.create({
      data: {
        uploaderId: userId,
        fileUrl,
        fileType,
        fileSize: dto.fileSize,
      },
    });

    return {
      id: attachment.id,
      fileUrl: attachment.fileUrl,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
    };
  }

  /** 아직 게시글에 연결되지 않은 첨부파일만 본인이 직접 삭제할 수 있다. */
  async remove(userId: string, attachmentId: string): Promise<void> {
    const attachment = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.uploaderId !== userId) {
      throw new AppException(ErrorCode.ATTACHMENT_NOT_FOUND);
    }
    if (attachment.postId) {
      throw new AppException(
        ErrorCode.ATTACHMENT_ALREADY_LINKED,
        '게시글에 연결된 첨부파일은 게시글 수정을 통해서만 제거할 수 있습니다.',
      );
    }

    const key = this.storageService.extractKeyFromPublicUrl(attachment.fileUrl);
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    if (key) {
      await this.storageService.deleteObject(key);
    }
  }

  /**
   * 게시글 생성 시 사용 - 지정된 attachmentId들을 해당 게시글에 연결한다.
   * 1) 실제로 존재하고 2) 요청자 본인이 업로드했으며 3) 아직 다른 게시글에 연결되지 않았는지 검증한다.
   */
  async linkToPost(
    tx: Prisma.TransactionClient,
    userId: string,
    attachmentIds: string[],
    postId: string,
  ): Promise<void> {
    if (attachmentIds.length === 0) return;

    const attachments = await tx.attachment.findMany({ where: { id: { in: attachmentIds } } });

    if (attachments.length !== attachmentIds.length) {
      throw new AppException(ErrorCode.ATTACHMENT_NOT_FOUND);
    }

    for (const attachment of attachments) {
      if (attachment.uploaderId !== userId) {
        throw new AppException(ErrorCode.FORBIDDEN, '본인이 업로드한 첨부파일만 사용할 수 있습니다.');
      }
      if (attachment.postId && attachment.postId !== postId) {
        throw new AppException(ErrorCode.ATTACHMENT_ALREADY_LINKED);
      }
    }

    await tx.attachment.updateMany({
      where: { id: { in: attachmentIds } },
      data: { postId },
    });
  }

  /**
   * 게시글 수정 시 사용 - "이 게시글이 최종적으로 가져야 할 첨부파일 id 목록"을 받아
   * 기존 연결과 비교(diff)한다. 목록에서 빠진 첨부파일은 연결 해제와 동시에 실제로 삭제하고
   * (고아 파일이 스토리지에 남지 않도록), 새로 추가된 것은 linkToPost와 동일한 검증 후 연결한다.
   * 즉 attachmentIds는 "추가 목록"이 아니라 "최종 목록"이다.
   */
  async syncPostAttachments(
    tx: Prisma.TransactionClient,
    userId: string,
    postId: string,
    desiredAttachmentIds: string[],
  ): Promise<void> {
    const currentlyLinked = await tx.attachment.findMany({ where: { postId } });
    const desiredSet = new Set(desiredAttachmentIds);
    const currentSet = new Set(currentlyLinked.map((attachment) => attachment.id));

    const toRemove = currentlyLinked.filter((attachment) => !desiredSet.has(attachment.id));
    const toAddIds = desiredAttachmentIds.filter((id) => !currentSet.has(id));

    for (const attachment of toRemove) {
      const key = this.storageService.extractKeyFromPublicUrl(attachment.fileUrl);
      await tx.attachment.delete({ where: { id: attachment.id } });
      if (key) {
        await this.storageService.deleteObject(key);
      }
    }

    if (toAddIds.length > 0) {
      await this.linkToPost(tx, userId, toAddIds, postId);
    }
  }

  private assertSizeWithinPolicy(contentType: string, fileSize: number): void {
    const maxSize = maxSizeForContentType(contentType);
    if (fileSize > maxSize) {
      const limitMb = Math.round(maxSize / (1024 * 1024));
      throw new AppException(ErrorCode.FILE_TOO_LARGE, `이 형식의 파일은 최대 ${limitMb}MB까지 업로드할 수 있습니다.`);
    }
  }
}
