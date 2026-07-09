import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * 댓글은 게시글과 달리 Markdown을 지원하지 않는다 - 순수 텍스트로 저장/응답한다
 * (렌더링/새니타이즈 단계 자체가 없음, 즉 XSS 공격 표면 자체가 없다).
 *
 * 향후 인라인 코드(`` `code` ``)나 코드블록 정도의 아주 제한적인 서식만 추가하고 싶다면,
 * 4단계에서 만든 MarkdownService를 그대로 재사용하되 훨씬 좁은 allowlist
 * (예: allowedTags: ['code', 'pre'])로 별도 렌더 메서드를 하나 추가하는 방식을 권장한다.
 * 지금 당장 스키마나 DTO를 바꿀 필요는 없다 - content 컬럼은 이미 TEXT이므로
 * 서식 있는 텍스트가 오더라도 저장 자체는 문제없고, 렌더링 정책만 나중에 추가하면 된다.
 */
export class CreateCommentDto {
  @ApiProperty({ example: '좋은 글 감사합니다!' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({ description: '대댓글인 경우 최상위 댓글의 id' })
  @IsOptional()
  @IsUUID('all')
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ example: '수정된 댓글 내용입니다.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}
