import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionCode } from '../../common/constants/permission-codes';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

/**
 * 카테고리 관리 - Role 축(ADMIN/SUPER_ADMIN)과 Permission 축(BOARD_MANAGE)을 함께 적용한다.
 * 현재 시드 데이터상 ADMIN/SUPER_ADMIN 모두 BOARD_MANAGE를 가지고 있어 결과상 동일하지만,
 * 이후 "게시판 관리 권한만 가진 별도 역할"을 만들거나 ADMIN에서 이 권한을 회수하고 싶을 때
 * role_permissions 테이블만 바꾸면 되고 컨트롤러 코드는 그대로 유지된다.
 */
@ApiTags('admin-categories')
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermission(PermissionCode.BOARD_MANAGE)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: '카테고리 전체 목록 조회 (비활성 게시판 포함)' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async findAll() {
    return this.categoriesService.findAllForAdmin();
  }

  @Post()
  @ApiOperation({ summary: '카테고리 생성' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '카테고리 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '카테고리 삭제 (하위 게시판이 있으면 거부)' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
