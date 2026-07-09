import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '카테고리 목록 조회 (하위 게시판 포함)' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async findAll() {
    return this.categoriesService.findAllPublic();
  }
}
