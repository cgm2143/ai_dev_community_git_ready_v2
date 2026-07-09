import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserSearchResultDto {
  @ApiProperty()
  nickname!: string;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bio!: string | null;
}

export class TagSearchResultDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  usageCount!: number;
}

export class BoardSearchResultDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
}

export class AutocompletePostSuggestionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

export class AutocompleteResponseDto {
  @ApiProperty({ type: [AutocompletePostSuggestionDto] })
  posts!: AutocompletePostSuggestionDto[];

  @ApiProperty({ type: [String] })
  tags!: string[];
}

export class PopularSearchTermDto {
  @ApiProperty()
  term!: string;

  @ApiProperty()
  score!: number;
}
