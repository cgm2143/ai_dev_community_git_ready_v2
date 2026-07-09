import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { IpBanService } from './ip-ban.service';
import { CreateIpBanDto } from './dto/ip-ban.dto';

@ApiTags('admin-ip-bans')
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/ip-bans')
export class AdminIpBansController {
  constructor(private readonly ipBanService: IpBanService) {}

  @Get()
  @ApiOperation({ summary: 'IP 차단 목록 조회' })
  async list() {
    return this.ipBanService.list();
  }

  @Post()
  @ApiOperation({ summary: 'IP 차단 등록 (만료일 미지정 시 무기한)' })
  async ban(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateIpBanDto) {
    return this.ipBanService.ban(admin.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'IP 차단 해제' })
  async unban(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.ipBanService.unban(admin.id, id);
  }
}
