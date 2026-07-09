import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReactionTargetType, ReactionType } from '@prisma/client';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ReactionsService } from './reactions.service';
import { ReactDto, ReactionResultDto } from './dto/react.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';

@ApiTags('reactions')
@RequireEmailVerified()
@Controller('comments/:id/reactions')
export class CommentReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @ApiOperation({ summary: '댓글 추천 (토글, 비추천은 지원하지 않음)' })
  @ApiResponse({ status: 200, type: ReactionResultDto })
  async react(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReactDto) {
    if (dto.type === 'DISLIKE') {
      throw new AppException(ErrorCode.REACTION_TYPE_NOT_SUPPORTED);
    }
    return this.reactionsService.react(user.id, ReactionTargetType.COMMENT, id, ReactionType.LIKE);
  }
}
