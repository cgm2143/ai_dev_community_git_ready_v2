import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { MAX_IMAGE_SIZE_BYTES } from '../../common/utils/image-validation.util';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { WithdrawAccountDto } from './dto/withdraw-account.dto';
import { MyProfileResponseDto, PublicProfileResponseDto } from './dto/user-response.dto';
import { ProfileImageResponseDto } from './dto/profile-image.dto';
import { BlockedUserResponseDto } from '../blocks/dto/blocked-user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, type: MyProfileResponseDto })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: '닉네임/소개글 수정' })
  @ApiResponse({ status: 200, type: MyProfileResponseDto })
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 변경 (현재 비밀번호 확인 필요, 성공 시 다른 세션 전체 로그아웃)' })
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.usersService.changePassword(user.id, dto);
  }

  @Post('me/profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      // 1차 방어선(빠른 거부). 실제 신뢰 기준은 UsersService의 매직 바이트 검증이다 —
      // 클라이언트가 보낸 mimetype/파일명은 여기서도 결국 조작 가능하기 때문.
      fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          callback(new BadRequestException('JPG, PNG, WebP 형식만 업로드할 수 있습니다.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({
    summary: '프로필 이미지 업로드 (최대 5MB, JPG/PNG/WebP만 허용, 서버에서 1024x1024 이하 WebP 변환 + 256x256 썸네일 생성 + EXIF 제거)',
  })
  @ApiResponse({ status: 200, type: ProfileImageResponseDto })
  async uploadProfileImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfileImage(user.id, file);
  }

  @Delete('me/profile-image')
  @ApiOperation({ summary: '프로필 이미지 삭제 (기본 이미지로 변경, 스토리지의 원본/썸네일도 정리)' })
  @ApiResponse({ status: 200, type: MyProfileResponseDto })
  async deleteProfileImage(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deleteProfileImage(user.id);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '회원 탈퇴 (물리 삭제 대신 익명화, 비밀번호 확인 필요)' })
  async withdraw(@CurrentUser() user: AuthenticatedUser, @Body() dto: WithdrawAccountDto): Promise<void> {
    await this.usersService.withdraw(user.id, dto.password);
  }

  @Get('me/blocks')
  @ApiOperation({ summary: '차단한 사용자 목록 조회' })
  @ApiResponse({ status: 200, type: [BlockedUserResponseDto] })
  async listBlockedUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listBlockedUsers(user.id);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '사용자 차단' })
  async blockUser(@CurrentUser() user: AuthenticatedUser, @Param('id') targetId: string): Promise<void> {
    await this.usersService.blockUser(user.id, targetId);
  }

  @Delete(':id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '사용자 차단 해제' })
  async unblockUser(@CurrentUser() user: AuthenticatedUser, @Param('id') targetId: string): Promise<void> {
    await this.usersService.unblockUser(user.id, targetId);
  }

  @Public()
  @Get(':nickname')
  @ApiOperation({ summary: '공개 프로필 조회' })
  @ApiResponse({ status: 200, type: PublicProfileResponseDto })
  async getPublicProfile(@Param('nickname') nickname: string) {
    return this.usersService.getPublicProfile(nickname);
  }
}
