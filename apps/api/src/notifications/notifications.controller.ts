import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Post('contact')
  @ApiOperation({ summary: 'Kontaktformular senden' })
  async contact(@Body() body: { name: string; email: string; subject: string; message: string }) {
    if (!body.name || !body.email || !body.message) {
      throw new BadRequestException('Name, E-Mail und Nachricht sind Pflichtfelder');
    }
    await this.notificationsService.sendContactForm(body);
    return { message: 'Nachricht gesendet' };
  }

}