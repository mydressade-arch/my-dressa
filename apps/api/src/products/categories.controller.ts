import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── Public: alle aktiven Kategorien ─────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Alle aktiven Kategorien' })
  findAll() {
    return this.categoriesService.findAll();
  }

  // ── Admin: alle Kategorien ───────────────────────────────────────────────
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Alle Kategorien inkl. inaktive' })
  findAllAdmin() {
    return this.categoriesService.findAllAdmin();
  }

  // ── Admin: erstellen ─────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Kategorie erstellen' })
  @ApiBody({ schema: { example: { name: 'Bridal', description: 'Brautkleider & mehr', sortOrder: 8 } } })
  create(@Body() dto: { name: string; description?: string; sortOrder?: number }) {
    return this.categoriesService.create(dto);
  }

  // ── Admin: bearbeiten ────────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Kategorie bearbeiten' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; description?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.categoriesService.update(id, dto);
  }

  // ── Admin: löschen ───────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Kategorie löschen' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }

  // ── Admin: Reihenfolge ───────────────────────────────────────────────────
  @Patch('admin/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Reihenfolge neu setzen' })
  reorder(@Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.categoriesService.reorder(body.items);
  }
}
