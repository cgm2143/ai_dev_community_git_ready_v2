import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionCode } from '../../common/constants/permission-codes';
import { BoardsService } from './boards.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';
import { BoardResponseDto } from './dto/board-response.dto';

@ApiTags('admin-boards')
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermission(PermissionCode.BOARD_MANAGE)
@Controller('admin/boards')
export class AdminBoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  @ApiOperation({ summary: '게시판 전체 목록 조회 (비활성 포함)' })
  @ApiResponse({ status: 200, type: [BoardResponseDto] })
  async findAll() {
    return this.boardsService.findAllForAdmin();
  }

  @Post()
  @ApiOperation({ summary: '게시판 생성' })
  async create(@Body() dto: CreateBoardDto) {
    return this.boardsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '게시판 수정 (활성/비활성 토글 포함)' })
  async update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게시판 삭제 (게시글이 있으면 거부)' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.boardsService.remove(id);
  }
}
