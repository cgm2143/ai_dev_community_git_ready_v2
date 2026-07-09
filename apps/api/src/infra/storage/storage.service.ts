import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageConfig } from '../../config/configuration';
import { S3_CLIENT } from './storage.constants';

const DEFAULT_UPLOAD_URL_TTL_SECONDS = 5 * 60; // 5분 - presigned URL 자체의 유효시간

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * S3 호환 오브젝트 스토리지(AWS S3, MinIO 등)를 감싼다.
 * 파일 자체는 백엔드 서버를 거치지 않고 클라이언트가 presigned URL로 직접 업로드한다
 * (백엔드 부하 감소, 1단계 아키텍처 설계에서 정한 방침). 백엔드는 URL 발급과,
 * 업로드 완료 후 최종 URL을 도메인 엔티티(User.profileImageUrl, Attachment 등)에
 * 반영하는 역할만 담당한다.
 */
@Injectable()
export class StorageService {
  private readonly config: StorageConfig;

  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<StorageConfig>('storage');
    if (!config) {
      throw new Error('storage 설정을 로드하지 못했습니다.');
    }
    this.config = config;
  }

  /**
   * 업로드 전용 presigned URL을 발급한다. key는 호출부(UsersService, AttachmentsService 등)가
   * 네임스페이스를 포함해 생성한다 (예: `avatars/{userId}/{uuid}.jpg`).
   */
  async createPresignedUploadUrl(key: string, contentType: string): Promise<PresignedUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: DEFAULT_UPLOAD_URL_TTL_SECONDS,
    });

    return { uploadUrl, publicUrl: this.buildPublicUrl(key), key };
  }

  buildPublicUrl(key: string): string {
    return `${this.config.publicUrlBase.replace(/\/$/, '')}/${key}`;
  }

  /**
   * 서버에서 처리(리사이즈/변환 등)를 마친 바이너리를 직접 업로드한다.
   * 프로필 이미지처럼 서버 사이드 가공이 필요한 파일은 클라이언트 direct-upload(presigned URL) 대신
   * 이 경로를 사용한다. 원본 그대로 저장하면 되는 첨부파일(4단계 Posts)은 계속 presigned URL을 사용한다.
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return this.buildPublicUrl(key);
  }

  /** key가 이 스토리지가 발급한 publicUrl에서 유래했는지 검증할 때 사용 (다른 사용자의 key 도용 방지) */
  extractKeyFromPublicUrl(url: string): string | null {
    const prefix = `${this.config.publicUrlBase.replace(/\/$/, '')}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }
}
