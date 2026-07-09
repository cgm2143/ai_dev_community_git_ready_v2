import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBannedWordDto {
  @ApiProperty({ example: '비속어예시' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  word!: string;
}
