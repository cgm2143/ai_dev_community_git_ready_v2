import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 'POST_NOT_FOUND' })
  code!: string;

  @ApiProperty({ example: '게시글을 찾을 수 없습니다.' })
  message!: string;

  @ApiProperty({ nullable: true, example: null })
  details!: unknown;
}

/**
 * 모든 에러 응답의 공통 스키마. HttpExceptionFilter가 실제로 내려주는 형태와 1:1 대응한다.
 * Swagger에서 @ApiResponse({ status: 404, type: ApiErrorResponseDto }) 형태로 참조한다.
 */
export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorDto })
  error!: ApiErrorDto;

  @ApiProperty({ example: '2026-07-07T12:00:00.000Z' })
  timestamp!: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 134 })
  total!: number;
}

/**
 * 모든 성공 응답의 공통 래퍼.
 * Swagger 문서에서 제네릭 타입을 그대로 노출하기 위해
 * 컨트롤러에서는 ApiResponseDto<PostResponseDto> 처럼 사용하고,
 * @ApiExtraModels + getSchemaPath 조합으로 실제 스키마를 노출한다 (7단계-2 이후 도메인 모듈에서 적용).
 */
export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  data?: T;

  @ApiProperty({ type: PaginationMetaDto, required: false })
  meta?: PaginationMetaDto;

  @ApiProperty({ type: ApiErrorDto, required: false })
  error?: ApiErrorDto;

  static ok<T>(data: T, meta?: PaginationMetaDto): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    if (meta) response.meta = meta;
    return response;
  }
}
