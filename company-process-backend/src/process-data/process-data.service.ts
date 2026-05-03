import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProcessDataDto } from './dto/create-process-data.dto';

@Injectable()
export class ProcessDataService {
  constructor(private prisma: PrismaService) {}

  private processDataInclude = {
    process: {
      select: { id: true, name: true, userId: true },
    },
    dataObject: true,
  } satisfies Prisma.ProcessDataInclude;

  private handlePrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
    ) {
      throw new ConflictException('Такая связь процесса и данных уже существует');
    }
    throw error;
  }

  private async ensureProcessAccess(processId: number, userId: number) {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      select: { id: true, userId: true },
    });

    if (!process || process.userId !== userId) {
      throw new ForbiddenException('Нет доступа к указанному процессу');
    }
  }

  private async ensureDataObjectAccess(dataObjectId: number, userId: number) {
    const dataObject = await this.prisma.dataObject.findUnique({
      where: { id: dataObjectId },
      select: { id: true, userId: true },
    });

    if (!dataObject || dataObject.userId !== userId) {
      throw new ForbiddenException('Нет доступа к указанному объекту данных');
    }
  }

  async create(dto: CreateProcessDataDto, userId: number) {
    await this.ensureProcessAccess(dto.processId, userId);
    await this.ensureDataObjectAccess(dto.dataObjectId, userId);

    try {
      return await this.prisma.processData.create({
        data: {
          processId: dto.processId,
          dataObjectId: dto.dataObjectId,
          type: dto.type,
        },
        include: this.processDataInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(userId: number, processId?: number) {
    return this.prisma.processData.findMany({
      where: {
        process: {
          userId,
          ...(processId !== undefined ? { id: processId } : {}),
        },
      },
      include: this.processDataInclude,
      orderBy: { id: 'asc' },
    });
  }

  async remove(id: number, userId: number) {
    const link = await this.prisma.processData.findUnique({
      where: { id },
      include: {
        process: {
          select: { userId: true },
        },
      },
    });

    if (!link) {
      throw new NotFoundException(`Связь ProcessData с id ${id} не найдена`);
    }
    if (link.process.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этой связи');
    }

    return this.prisma.processData.delete({ where: { id } });
  }
}
