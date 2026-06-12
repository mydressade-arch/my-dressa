import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Eigenes Profil abrufen' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Get('merchant-profile-debug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async merchantProfileDebug(@CurrentUser() user: User) {
    return {
      userId: user.id,
      userRole: user.role,
      merchantProfile: (user as any).merchantProfile,
      hasProfile: !!(user as any).merchantProfile,
    };
  }

  @Get('merchant-profile')
  @ApiOperation({ summary: 'Händlerprofil abrufen' })
  getMerchantProfile(@CurrentUser() user: User) {
    return this.usersService.getMerchantProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Profil aktualisieren' })
  updateProfile(@CurrentUser() user: User, @Body() data: Partial<User>) {
    const { id, email, passwordHash, role, ...safe } = data as any;
    return this.usersService.updateProfile(user.id, safe);
  }
}
