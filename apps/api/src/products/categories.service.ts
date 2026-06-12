import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  // ── Public: alle aktiven Kategorien ─────────────────────────────────────
  async findAll(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  // ── Admin: alle Kategorien (inkl. inaktive) ──────────────────────────────
  async findAllAdmin(): Promise<Category[]> {
    return this.categoryRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  // ── Admin: Kategorie erstellen ───────────────────────────────────────────
  async create(dto: { name: string; description?: string; sortOrder?: number }): Promise<Category> {
    const existing = await this.categoryRepo.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing) throw new ConflictException(`Kategorie "${dto.name}" existiert bereits`);

    const category = this.categoryRepo.create({
      name:        dto.name.trim(),
      description: dto.description?.trim() || null,
      sortOrder:   dto.sortOrder ?? 99,
      isActive:    true,
    });
    return this.categoryRepo.save(category);
  }

  // ── Admin: Kategorie bearbeiten ──────────────────────────────────────────
  async update(id: string, dto: {
    name?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategorie nicht gefunden');

    if (dto.name && dto.name.trim() !== category.name) {
      const existing = await this.categoryRepo.findOne({ where: { name: dto.name.trim() } });
      if (existing) throw new ConflictException(`Name "${dto.name}" ist bereits vergeben`);
    }

    await this.categoryRepo.update(id, {
      ...(dto.name        && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
      ...(dto.sortOrder   !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.isActive    !== undefined && { isActive: dto.isActive }),
    });

    return this.categoryRepo.findOne({ where: { id } }) as Promise<Category>;
  }

  // ── Admin: Kategorie löschen ─────────────────────────────────────────────
  async remove(id: string): Promise<{ message: string }> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategorie nicht gefunden');
    await this.categoryRepo.delete(id);
    return { message: `Kategorie "${category.name}" gelöscht` };
  }

  // ── Admin: Reihenfolge neu setzen ────────────────────────────────────────
  async reorder(items: { id: string; sortOrder: number }[]): Promise<{ message: string }> {
    await Promise.all(
      items.map(item => this.categoryRepo.update(item.id, { sortOrder: item.sortOrder }))
    );
    return { message: 'Reihenfolge aktualisiert' };
  }
}
