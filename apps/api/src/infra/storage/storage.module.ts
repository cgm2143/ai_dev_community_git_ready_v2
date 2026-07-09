import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageConfig } from '../../config/configuration';
import { S3_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';

const s3ClientProvider = {
  provide: S3_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): S3Client => {
    const storageConfig = configService.get<StorageConfig>('storage');
    return new S3Client({
      endpoint: storageConfig?.endpoint,
      region: storageConfig?.region,
      forcePathStyle: storageConfig?.forcePathStyle,
      credentials: {
        accessKeyId: storageConfig?.accessKeyId ?? '',
        secretAccessKey: storageConfig?.secretAccessKey ?? '',
      },
    });
  },
};

@Module({
  providers: [s3ClientProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
