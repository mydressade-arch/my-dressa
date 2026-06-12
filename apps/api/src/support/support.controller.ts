import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT, UserRole.ADMIN)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('dashboard')
  getDashboard() { return this.supportService.getDashboard(); }

  @Get('orders')
  searchOrders(@Query('q') q?: string, @Query('status') status?: string, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1) {
    return this.supportService.searchOrders(q, status, page);
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseUUIDPipe) id: string) { return this.supportService.getOrderDetail(id); }

  @Patch('orders/:id/status')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: string, @CurrentUser() agent: User) {
    return this.supportService.updateOrderStatus(id, status, agent.id);
  }

  @Post('orders/:id/refund')
  refundOrder(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string, @CurrentUser() agent: User) {
    return this.supportService.refundOrder(id, reason, agent.id);
  }

  @Post('orders/:id/notes')
  addNote(@Param('id', ParseUUIDPipe) id: string, @Body('note') note: string, @CurrentUser() agent: User) {
    return this.supportService.addNote(id, note, agent.id, `${agent.firstName} ${agent.lastName}`);
  }

  @Get('orders/:id/notes')
  getNotes(@Param('id', ParseUUIDPipe) id: string) { return this.supportService.getNotes(id); }

  @Get('customers')
  searchCustomers(@Query('q') q?: string) { return this.supportService.searchCustomers(q); }

  @Get('customers/:id')
  getCustomer(@Param('id', ParseUUIDPipe) id: string) { return this.supportService.getCustomerDetail(id); }

  @Get('damage-reports')
  getDamageReports(@Query('status') status?: string) { return this.supportService.getDamageReports(status); }
}
