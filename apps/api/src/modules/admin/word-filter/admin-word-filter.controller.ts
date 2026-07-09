import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { WordFilterService } from './word-filter.service';
import { CreateBannedWordDto } from './dto/banned-word.dto';

@ApiTags('admin-word-filter')
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/words')
export class AdminWordFilterController {
  constructor(private readonly wordFilterService: WordFilterService) {}

  @Get()
  @ApiOperation({ summary: '금칙어 목록 조회' })
  async list() {
    return this.wordFilterService.list();
  }

  @Post()
  @ApiOperation({ summary: '금칙어 등록' })
  async add(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateBannedWordDto) {
    return this.wordFilterService.add(admin.id, dto.word);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '금칙어 삭제' })
  async remove(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.wordFilterService.remove(admin.id, id);
  }
}
