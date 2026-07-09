import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AttachmentsService } from './attachments.service';
import { RequestAttachmentUploadDto, ConfirmAttachmentDto } from './dto/attachment.dto';
import { AttachmentResponseDto, PresignedUploadResponseDto } from './dto/attachment-response.dto';

@ApiTags('attachments')
@RequireEmailVerified()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('presigned-url')
  @ApiOperation({ summary: '첨부파일 업로드용 Presigned URL 발급' })
  @ApiResponse({ status: 201, type: PresignedUploadResponseDto })
  async requestUpload(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestAttachmentUploadDto) {
    return this.attachmentsService.requestUpload(user.id, dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: '업로드 완료 후 첨부파일 메타데이터 등록' })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  async confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmAttachmentDto) {
    return this.attachmentsService.confirm(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '첨부파일 삭제 (게시글에 연결되지 않은 것만 가능)' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.attachmentsService.remove(user.id, id);
  }
}
