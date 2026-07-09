import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReactionTargetType, ReactionType } from '@prisma/client';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ReactionsService } from './reactions.service';
import { ReactDto, ReactionResultDto } from './dto/react.dto';

@ApiTags('reactions')
@RequireEmailVerified()
@Controller('posts/:id/reactions')
export class PostReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @ApiOperation({ summary: '게시글 추천/비추천 (토글)' })
  @ApiResponse({ status: 200, type: ReactionResultDto })
  async react(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReactDto) {
    return this.reactionsService.react(
      user.id,
      ReactionTargetType.POST,
      id,
      dto.type === 'LIKE' ? ReactionType.LIKE : ReactionType.DISLIKE,
    );
  }
}
