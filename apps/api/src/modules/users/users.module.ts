import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StorageModule } from '../../infra/storage/storage.module';
import { ImageModule } from '../../infra/image/image.module';
import { AuthModule } from '../auth/auth.module';
import { BlocksModule } from '../blocks/blocks.module';
import { ProfileImageUrlService } from './services/profile-image-url.service';
import { ProfileImageCleanupService } from './services/profile-image-cleanup.service';
import { UserTargetValidatorRegistrar } from './user-target-validator.registrar';

@Module({
  imports: [StorageModule, ImageModule, AuthModule, BlocksModule],
  controllers: [UsersController],
  providers: [UsersService, ProfileImageUrlService, ProfileImageCleanupService, UserTargetValidatorRegistrar],
})
export class UsersModule {}
