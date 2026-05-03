import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateDataObjectDto } from './dto/create-data-object.dto';
import { UpdateDataObjectDto } from './dto/update-data-object.dto';

@Injectable()
export class DataObjectService {
  constructor(private prisma: PrismaService) {}

  private dataObjectInclude = {
    processData: {
      include: {
        process: {
          select: { id: true, name: true },
        },
      },
    },
    taskData: {
      include: {
        task: {
          select: { id: true, name: true },
        },
      },
    },
  } satisfies Prisma.DataObjectInclude;

  private handlePrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
    ) {
      throw new ConflictException('Объект данных с таким названием уже существует');
    }
    throw error;
  }

  async create(dto: CreateDataObjectDto, userId: number) {
    try {
      return await this.prisma.dataObject.create({
        data: {
          name: dto.name,
          description: dto.description,
          userId,
        },
        include: this.dataObjectInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(userId: number) {
    return this.prisma.dataObject.findMany({
      where: { userId },
      include: this.dataObjectInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    const dataObject = await this.prisma.dataObject.findUnique({
      where: { id },
      include: this.dataObjectInclude,
    });

    if (!dataObject) {
      throw new NotFoundException(`Объект данных с id ${id} не найден`);
    }
    if (dataObject.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому объекту данных');
    }

    return dataObject;
  }

  async update(id: number, dto: UpdateDataObjectDto, userId: number) {
    const dataObject = await this.prisma.dataObject.findUnique({ where: { id } });
    if (!dataObject) {
      throw new NotFoundException(`Объект данных с id ${id} не найден`);
    }
    if (dataObject.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому объекту данных');
    }

    try {
      return await this.prisma.dataObject.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
        include: this.dataObjectInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number, userId: number) {
    const dataObject = await this.prisma.dataObject.findUnique({ where: { id } });
    if (!dataObject) {
      throw new NotFoundException(`Объект данных с id ${id} не найден`);
    }
    if (dataObject.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому объекту данных');
    }

    const [, , deleted] = await this.prisma.$transaction([
      this.prisma.processData.deleteMany({ where: { dataObjectId: id } }),
      this.prisma.taskData.deleteMany({ where: { dataObjectId: id } }),
      this.prisma.dataObject.delete({ where: { id } }),
    ]);

    return deleted;
  }
}
