import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TwoFaService } from './two-fa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('2FA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/2fa')
export class TwoFaController {
  constructor(private readonly twoFaService: TwoFaService) {}

  @Get('generate')
  @ApiOperation({ summary: 'QR Code für Google Authenticator generieren' })
  generate(@CurrentUser() user: User) {
    return this.twoFaService.generateSecret(user.id);
  }

  @Post('enable')
  @ApiOperation({ summary: '2FA aktivieren — Code aus Authenticator eingeben' })
  enable(@CurrentUser() user: User, @Body('code') code: string) {
    return this.twoFaService.enable(user.id, code);
  }

  @Post('disable')
  @ApiOperation({ summary: '2FA deaktivieren' })
  disable(@CurrentUser() user: User, @Body('code') code: string) {
    return this.twoFaService.disable(user.id, code);
  }
}
