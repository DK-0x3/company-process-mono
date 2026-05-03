import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialService {
  constructor(private prisma: PrismaService) {}

  private materialInclude = {
    category: {
      select: {
        id: true,
        name: true,
      },
    },
    processMaterials: {
      include: {
        process: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    taskMaterials: {
      include: {
        task: {
          select: {
            id: true,
            name: true,
            processId: true,
          },
        },
      },
    },
    _count: {
      select: {
        processMaterials: true,
        taskMaterials: true,
      },
    },
  } satisfies Prisma.MaterialInclude;

  private materialCategoryInclude = {
    _count: {
      select: {
        materials: true,
      },
    },
  } satisfies Prisma.MaterialCategoryInclude;

  private normalizeIds(ids?: number[]) {
    if (!ids) return undefined;
    return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  }

  private handlePrismaError(error: unknown, duplicateMessage: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
    ) {
      throw new ConflictException(duplicateMessage);
    }

    throw error;
  }

  private async ensureCategoryAccess(categoryId: number, userId: number) {
    const category = await this.prisma.materialCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, userId: true },
    });

    if (!category) {
      throw new NotFoundException(`Категория материала с id ${categoryId} не найдена`);
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Нет доступа к категории материала');
    }
  }

  private async ensureProcessesAccess(processIds: number[], userId: number) {
    if (processIds.length === 0) return;

    const processes = await this.prisma.process.findMany({
      where: {
        id: { in: processIds },
        userId,
      },
      select: { id: true },
    });

    if (processes.length !== processIds.length) {
      throw new ForbiddenException('Один или несколько процессов недоступны для привязки');
    }
  }

  private async ensureTasksAccess(taskIds: number[], userId: number) {
    if (taskIds.length === 0) return;

    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      select: { id: true },
    });

    if (tasks.length !== taskIds.length) {
      throw new ForbiddenException('Одна или несколько задач недоступны для привязки');
    }
  }

  async createCategory(dto: CreateMaterialCategoryDto, userId: number) {
    try {
      return await this.prisma.materialCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          userId,
        },
        include: this.materialCategoryInclude,
      });
    } catch (error) {
      this.handlePrismaError(error, 'Категория с таким названием уже существует');
    }
  }

  async findAllCategories(userId: number) {
    return this.prisma.materialCategory.findMany({
      where: { userId },
      include: this.materialCategoryInclude,
      orderBy: { id: 'asc' },
    });
  }

  async updateCategory(id: number, dto: UpdateMaterialCategoryDto, userId: number) {
    const category = await this.prisma.materialCategory.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!category) {
      throw new NotFoundException(`Категория материала с id ${id} не найдена`);
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Нет доступа к категории материала');
    }

    try {
      return await this.prisma.materialCategory.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
        include: this.materialCategoryInclude,
      });
    } catch (error) {
      this.handlePrismaError(error, 'Категория с таким названием уже существует');
    }
  }

  async removeCategory(id: number, userId: number) {
    const category = await this.prisma.materialCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            materials: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Категория материала с id ${id} не найдена`);
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Нет доступа к категории материала');
    }
    if (category._count.materials > 0) {
      throw new ConflictException(
        'Нельзя удалить категорию, пока в ней есть материалы. Перенесите или удалите материалы сначала.',
      );
    }

    return this.prisma.materialCategory.delete({ where: { id } });
  }

  async create(dto: CreateMaterialDto, userId: number) {
    const processIds = this.normalizeIds(dto.processIds) ?? [];
    const taskIds = this.normalizeIds(dto.taskIds) ?? [];

    await this.ensureCategoryAccess(dto.categoryId, userId);
    await this.ensureProcessesAccess(processIds, userId);
    await this.ensureTasksAccess(taskIds, userId);

    const data: Prisma.MaterialCreateInput = {
      name: dto.name,
      content: dto.content,
      category: {
        connect: { id: dto.categoryId },
      },
      user: {
        connect: { id: userId },
      },
    };

    if (processIds.length > 0) {
      data.processMaterials = {
        create: processIds.map((processId) => ({
          process: {
            connect: { id: processId },
          },
        })),
      };
    }

    if (taskIds.length > 0) {
      data.taskMaterials = {
        create: taskIds.map((taskId) => ({
          task: {
            connect: { id: taskId },
          },
        })),
      };
    }

    try {
      return await this.prisma.material.create({
        data,
        include: this.materialInclude,
      });
    } catch (error) {
      this.handlePrismaError(error, 'Материал с таким названием уже существует');
    }
  }

  async findAll(userId: number) {
    return this.prisma.material.findMany({
      where: { userId },
      include: this.materialInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: this.materialInclude,
    });

    if (!material) {
      throw new NotFoundException(`Материал с id ${id} не найден`);
    }
    if (material.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому материалу');
    }

    return material;
  }

  async update(id: number, dto: UpdateMaterialDto, userId: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!material) {
      throw new NotFoundException(`Материал с id ${id} не найден`);
    }
    if (material.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому материалу');
    }

    const processIds = dto.processIds ? this.normalizeIds(dto.processIds) ?? [] : undefined;
    const taskIds = dto.taskIds ? this.normalizeIds(dto.taskIds) ?? [] : undefined;

    if (dto.categoryId !== undefined) {
      await this.ensureCategoryAccess(dto.categoryId, userId);
    }
    if (processIds !== undefined) {
      await this.ensureProcessesAccess(processIds, userId);
    }
    if (taskIds !== undefined) {
      await this.ensureTasksAccess(taskIds, userId);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.material.update({
          where: { id },
          data: {
            name: dto.name,
            content: dto.content,
            categoryId: dto.categoryId,
          },
        });

        if (processIds !== undefined) {
          await tx.processMaterial.deleteMany({ where: { materialId: id } });
          if (processIds.length > 0) {
            await tx.processMaterial.createMany({
              data: processIds.map((processId) => ({
                processId,
                materialId: id,
              })),
            });
          }
        }

        if (taskIds !== undefined) {
          await tx.taskMaterial.deleteMany({ where: { materialId: id } });
          if (taskIds.length > 0) {
            await tx.taskMaterial.createMany({
              data: taskIds.map((taskId) => ({
                taskId,
                materialId: id,
              })),
            });
          }
        }
      });

      return this.prisma.material.findUnique({
        where: { id },
        include: this.materialInclude,
      });
    } catch (error) {
      this.handlePrismaError(error, 'Материал с таким названием уже существует');
    }
  }

  async remove(id: number, userId: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!material) {
      throw new NotFoundException(`Материал с id ${id} не найден`);
    }
    if (material.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому материалу');
    }

    const [, , deleted] = await this.prisma.$transaction([
      this.prisma.processMaterial.deleteMany({ where: { materialId: id } }),
      this.prisma.taskMaterial.deleteMany({ where: { materialId: id } }),
      this.prisma.material.delete({ where: { id } }),
    ]);

    return deleted;
  }
}
