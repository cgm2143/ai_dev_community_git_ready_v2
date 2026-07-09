import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { AdsService } from './ads.service';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Public()
  @Get('slots/:code')
  @ApiOperation({ summary: '특정 슬롯의 활성 광고 조회 (예: HOME_FEED_1)' })
  async getBySlot(@Param('code') code: string) {
    return this.adsService.getActiveBySlotCode(code);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } }) // IP당 1분 30회 - 노출 집계 어뷰징 방지
  @Post(':id/impression')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '광고 노출 기록 (동일 IP당 광고별 1분 쿨다운)' })
  async recordImpression(@Param('id') id: string, @Req() req: Request): Promise<void> {
    await this.adsService.recordImpression(id, req.ip ?? 'unknown');
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post(':id/click')
  @ApiOperation({ summary: '광고 클릭 기록 후 이동 URL 반환' })
  async recordClick(@Param('id') id: string, @Req() req: Request) {
    return this.adsService.recordClick(id, req.ip ?? 'unknown');
  }
}
