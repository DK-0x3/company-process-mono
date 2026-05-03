import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TestQuestionType } from '@prisma/client';
import { CurrentUserData } from '../auth/current-user.interface';
import { PrismaService } from '../prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestQuestionDto } from './dto/test-question.dto';
import { UpdateTestDto } from './dto/update-test.dto';

interface NormalizedQuestionOption {
  text: string;
  isCorrect: boolean;
  order: number;
}

interface NormalizedQuestion {
  type: TestQuestionType;
  title: string;
  description?: string;
  order: number;
  isRequired: boolean;
  textAnswerPlaceholder?: string;
  expectedTextAnswer?: string;
  options: NormalizedQuestionOption[];
}

interface NormalizedSubmittedAnswer {
  questionId: number;
  selectedOptionIds: number[];
  textAnswer?: string;
  usedHint: boolean;
}

interface EmployeeTestAccessContext {
  employeeId: number;
  employeePositionId: number | null;
  ownerUserId: number;
  responsibleProcessIds: number[];
  responsibleTaskIds: number[];
}

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  private testInclude = {
    questions: {
      orderBy: { order: 'asc' },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    },
    employeeLinks: {
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    },
    positionLinks: {
      include: {
        position: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    processLinks: {
      include: {
        process: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    taskLinks: {
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
        employeeLinks: true,
        positionLinks: true,
        processLinks: true,
        taskLinks: true,
      },
    },
  } satisfies Prisma.TestInclude;

  private normalizeIds(ids?: number[]) {
    if (!ids) return undefined;
    return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  }

  private normalizeComparableText(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private buildEmployeeTestWhereInput(context: EmployeeTestAccessContext): Prisma.TestWhereInput {
    const accessConditions: Prisma.TestWhereInput[] = [
      {
        employeeLinks: {
          some: {
            employeeId: context.employeeId,
          },
        },
      },
    ];

    if (context.employeePositionId !== null) {
      accessConditions.push({
        positionLinks: {
          some: {
            positionId: context.employeePositionId,
          },
        },
      });
    }

    if (context.responsibleProcessIds.length > 0) {
      accessConditions.push({
        processLinks: {
          some: {
            processId: {
              in: context.responsibleProcessIds,
            },
          },
        },
      });
    }

    if (context.responsibleTaskIds.length > 0) {
      accessConditions.push({
        taskLinks: {
          some: {
            taskId: {
              in: context.responsibleTaskIds,
            },
          },
        },
      });
    }

    return {
      userId: context.ownerUserId,
      OR: accessConditions,
    };
  }

  private sanitizeTestForEmployee<T extends {
    questions?: Array<{
      expectedTextAnswer?: string | null;
      options?: Array<Record<string, unknown>>;
    }>;
  }>(test: T): T {
    if (!test.questions) {
      return test;
    }

    return {
      ...test,
      questions: test.questions.map((question) => ({
        ...question,
        expectedTextAnswer: null,
        options: (question.options ?? []).map((option) => ({
          ...option,
          isCorrect: undefined,
        })),
      })),
    };
  }

  private normalizeSubmittedAnswers(dto: SubmitTestDto): NormalizedSubmittedAnswer[] {
    const normalized = dto.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionIds: this.normalizeIds(answer.selectedOptionIds) ?? [],
      textAnswer: answer.textAnswer?.trim() || undefined,
      usedHint: answer.usedHint ?? false,
    }));

    const seenQuestionIds = new Set<number>();
    normalized.forEach((answer) => {
      if (seenQuestionIds.has(answer.questionId)) {
        throw new BadRequestException(
          `Дублируется ответ для вопроса с id ${answer.questionId}`,
        );
      }
      seenQuestionIds.add(answer.questionId);
    });

    return normalized;
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

  private normalizeQuestions(questions: TestQuestionDto[]): NormalizedQuestion[] {
    return questions.map((question, questionIndex) => {
      const normalizedOptions = (question.options ?? []).map((option, optionIndex) => ({
        text: option.text.trim(),
        isCorrect: option.isCorrect ?? false,
        order: option.order ?? optionIndex + 1,
      }));

      return {
        type: question.type,
        title: question.title.trim(),
        description: question.description?.trim() || undefined,
        order: question.order ?? questionIndex + 1,
        isRequired: question.isRequired ?? true,
        textAnswerPlaceholder: question.textAnswerPlaceholder?.trim() || undefined,
        expectedTextAnswer: question.expectedTextAnswer?.trim() || undefined,
        options: normalizedOptions,
      };
    });
  }

  private validateQuestions(questions: NormalizedQuestion[]) {
    if (questions.length === 0) {
      throw new BadRequestException('Тест должен содержать хотя бы один вопрос');
    }

    const questionOrderSet = new Set<number>();

    questions.forEach((question, questionIndex) => {
      if (!question.title) {
        throw new BadRequestException(`Вопрос #${questionIndex + 1}: пустой текст вопроса`);
      }

      if (questionOrderSet.has(question.order)) {
        throw new BadRequestException(`Дублирующийся порядок вопросов: ${question.order}`);
      }
      questionOrderSet.add(question.order);

      if (question.type === TestQuestionType.text) {
        if (question.options.length > 0) {
          throw new BadRequestException(
            `Вопрос "${question.title}": текстовый тип не должен содержать варианты ответа`,
          );
        }
        return;
      }

      if (question.options.length < 2) {
        throw new BadRequestException(
          `Вопрос "${question.title}": для выбора необходимо минимум 2 варианта ответа`,
        );
      }

      const optionOrderSet = new Set<number>();
      question.options.forEach((option) => {
        if (!option.text) {
          throw new BadRequestException(
            `Вопрос "${question.title}": найден пустой вариант ответа`,
          );
        }

        if (optionOrderSet.has(option.order)) {
          throw new BadRequestException(
            `Вопрос "${question.title}": дублирующийся порядок вариантов ${option.order}`,
          );
        }
        optionOrderSet.add(option.order);
      });

      const correctCount = question.options.filter((option) => option.isCorrect).length;

      if (question.type === TestQuestionType.single_choice && correctCount !== 1) {
        throw new BadRequestException(
          `Вопрос "${question.title}": для single_choice должен быть ровно 1 правильный ответ`,
        );
      }

      if (question.type === TestQuestionType.multiple_choice && correctCount < 1) {
        throw new BadRequestException(
          `Вопрос "${question.title}": для multiple_choice должен быть минимум 1 правильный ответ`,
        );
      }
    });
  }

  private async ensureEmployeesAccess(employeeIds: number[], userId: number) {
    if (employeeIds.length === 0) return;

    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        userId,
      },
      select: { id: true },
    });

    if (employees.length !== employeeIds.length) {
      throw new ForbiddenException('Один или несколько сотрудников недоступны для привязки');
    }
  }

  private async ensurePositionsAccess(positionIds: number[], userId: number) {
    if (positionIds.length === 0) return;

    const positions = await this.prisma.position.findMany({
      where: {
        id: { in: positionIds },
        userId,
      },
      select: { id: true },
    });

    if (positions.length !== positionIds.length) {
      throw new ForbiddenException('Одна или несколько должностей недоступны для привязки');
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

  private async ensureTestAccess(id: number, userId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!test) {
      throw new NotFoundException(`Тест с id ${id} не найден`);
    }

    if (test.userId !== userId) {
      throw new ForbiddenException('Нет доступа к тесту');
    }
  }

  private async getEmployeeTestAccessContext(
    user: CurrentUserData,
  ): Promise<EmployeeTestAccessContext> {
    if (user.actorType !== 'EMPLOYEE' || !user.employeeId) {
      throw new ForbiddenException('Доступ разрешен только сотруднику');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: user.employeeId,
        userId: user.ownerUserId,
      },
      select: {
        id: true,
        positionId: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    const responsibilityFilters = [
      { responsibleEmployeeId: employee.id },
      ...(employee.positionId ? [{ responsiblePositionId: employee.positionId }] : []),
    ];

    const [processes, tasks] = await Promise.all([
      this.prisma.process.findMany({
        where: {
          userId: user.ownerUserId,
          OR: responsibilityFilters,
        },
        select: { id: true },
      }),
      this.prisma.task.findMany({
        where: {
          userId: user.ownerUserId,
          OR: responsibilityFilters,
        },
        select: { id: true },
      }),
    ]);

    return {
      employeeId: employee.id,
      employeePositionId: employee.positionId,
      ownerUserId: user.ownerUserId,
      responsibleProcessIds: processes.map((item) => item.id),
      responsibleTaskIds: tasks.map((item) => item.id),
    };
  }

  private async executeTestPass(params: {
    testId: number;
    dto: SubmitTestDto;
    testOwnerUserId: number;
    resultUserId: number;
    allowRetake: boolean;
  }) {
    const { testId, dto, testOwnerUserId, resultUserId, allowRetake } = params;
    const test = await this.prisma.test.findFirst({
      where: {
        id: testId,
        userId: testOwnerUserId,
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`Тест с id ${testId} не найден`);
    }

    if (!allowRetake) {
      const existing = await this.prisma.testResult.findUnique({
        where: {
          testId_userId: {
            testId,
            userId: resultUserId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('Тест можно пройти только один раз');
      }
    }

    const normalizedAnswers = this.normalizeSubmittedAnswers(dto);
    const answersByQuestionId = new Map<number, NormalizedSubmittedAnswer>();
    normalizedAnswers.forEach((answer) => answersByQuestionId.set(answer.questionId, answer));

    const validQuestionIds = new Set(test.questions.map((question) => question.id));
    normalizedAnswers.forEach((answer) => {
      if (!validQuestionIds.has(answer.questionId)) {
        throw new BadRequestException(
          `Вопрос с id ${answer.questionId} не принадлежит этому тесту`,
        );
      }
    });

    const resultAnswers = test.questions.map((question) => {
      const submitted = answersByQuestionId.get(question.id);
      const selectedOptionIds = submitted?.selectedOptionIds ?? [];
      const textAnswer = submitted?.textAnswer;
      const hasHint = Boolean(question.description?.trim());
      const usedHint = hasHint ? (submitted?.usedHint ?? false) : false;

      const optionIds = new Set(question.options.map((option) => option.id));
      selectedOptionIds.forEach((optionId) => {
        if (!optionIds.has(optionId)) {
          throw new BadRequestException(
            `Вопрос "${question.title}": выбран недопустимый вариант ответа`,
          );
        }
      });

      if (question.type === TestQuestionType.text && selectedOptionIds.length > 0) {
        throw new BadRequestException(
          `Вопрос "${question.title}": для текстового вопроса нельзя выбирать варианты`,
        );
      }

      const hasExpectedText = Boolean(question.expectedTextAnswer?.trim());

      let isCorrect: boolean | null = null;
      let isEvaluated = false;

      if (question.type === TestQuestionType.single_choice) {
        isEvaluated = true;
        const correctOptionIds = question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id);
        isCorrect = selectedOptionIds.length === 1
          && correctOptionIds.length === 1
          && selectedOptionIds[0] === correctOptionIds[0];
      } else if (question.type === TestQuestionType.multiple_choice) {
        isEvaluated = true;
        const correctOptionIds = question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id)
          .sort((a, b) => a - b);
        const selectedSorted = [...selectedOptionIds].sort((a, b) => a - b);
        isCorrect = correctOptionIds.length === selectedSorted.length
          && correctOptionIds.every((id, index) => id === selectedSorted[index]);
      } else if (hasExpectedText) {
        isEvaluated = true;
        isCorrect = this.normalizeComparableText(textAnswer ?? '')
          === this.normalizeComparableText(question.expectedTextAnswer!);
      }

      return {
        questionId: question.id,
        selectedOptionIds,
        textAnswer: textAnswer ?? null,
        isCorrect,
        usedHint,
        isEvaluated,
      };
    });

    const totalQuestions = test.questions.length;
    const evaluatedQuestions = resultAnswers.filter((answer) => answer.isEvaluated).length;
    const correctAnswers = resultAnswers.filter((answer) => answer.isCorrect === true).length;
    const hintsTotal = test.questions.filter((question) => Boolean(question.description?.trim())).length;
    const hintsUsed = resultAnswers.filter((answer) => answer.usedHint).length;
    const score = correctAnswers;
    const percentage = evaluatedQuestions > 0
      ? Math.round((correctAnswers / evaluatedQuestions) * 10000) / 100
      : 0;

    const persistedResult = await this.prisma.$transaction(async (tx) => {
      const targetResult = allowRetake
        ? await tx.testResult.upsert({
            where: {
              testId_userId: {
                testId,
                userId: resultUserId,
              },
            },
            create: {
              testId,
              userId: resultUserId,
              score,
              correctAnswers,
              evaluatedQuestions,
              totalQuestions,
              percentage,
              durationSeconds: dto.durationSeconds,
              hintsUsed,
              hintsTotal,
            },
            update: {
              score,
              correctAnswers,
              evaluatedQuestions,
              totalQuestions,
              percentage,
              durationSeconds: dto.durationSeconds,
              hintsUsed,
              hintsTotal,
            },
          })
        : await tx.testResult.create({
            data: {
              testId,
              userId: resultUserId,
              score,
              correctAnswers,
              evaluatedQuestions,
              totalQuestions,
              percentage,
              durationSeconds: dto.durationSeconds,
              hintsUsed,
              hintsTotal,
            },
          });

      await tx.testResultAnswer.deleteMany({
        where: {
          testResultId: targetResult.id,
        },
      });

      if (resultAnswers.length > 0) {
        await tx.testResultAnswer.createMany({
          data: resultAnswers.map((answer) => ({
            testResultId: targetResult.id,
            questionId: answer.questionId,
            selectedOptionIds: answer.selectedOptionIds,
            textAnswer: answer.textAnswer,
            isCorrect: answer.isCorrect,
            usedHint: answer.usedHint,
          })),
        });
      }

      return targetResult;
    });

    return {
      ...persistedResult,
      answers: resultAnswers,
      test: {
        id: test.id,
        name: test.name,
        timeLimitMinutes: test.timeLimitMinutes,
      },
      submittedAt: new Date().toISOString(),
    };
  }

  async create(dto: CreateTestDto, userId: number) {
    const employeeIds = this.normalizeIds(dto.employeeIds) ?? [];
    const positionIds = this.normalizeIds(dto.positionIds) ?? [];
    const processIds = this.normalizeIds(dto.processIds) ?? [];
    const taskIds = this.normalizeIds(dto.taskIds) ?? [];

    const questions = this.normalizeQuestions(dto.questions);
    this.validateQuestions(questions);

    await this.ensureEmployeesAccess(employeeIds, userId);
    await this.ensurePositionsAccess(positionIds, userId);
    await this.ensureProcessesAccess(processIds, userId);
    await this.ensureTasksAccess(taskIds, userId);

    const data: Prisma.TestCreateInput = {
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      timeLimitMinutes: dto.timeLimitMinutes,
      user: {
        connect: { id: userId },
      },
      questions: {
        create: questions.map((question) => ({
          type: question.type,
          title: question.title,
          description: question.description,
          order: question.order,
          isRequired: question.isRequired,
          textAnswerPlaceholder: question.textAnswerPlaceholder,
          expectedTextAnswer: question.expectedTextAnswer,
          options:
            question.options.length > 0
              ? {
                  create: question.options.map((option) => ({
                    text: option.text,
                    isCorrect: option.isCorrect,
                    order: option.order,
                  })),
                }
              : undefined,
        })),
      },
    };

    if (employeeIds.length > 0) {
      data.employeeLinks = {
        create: employeeIds.map((employeeId) => ({
          employee: {
            connect: { id: employeeId },
          },
        })),
      };
    }

    if (positionIds.length > 0) {
      data.positionLinks = {
        create: positionIds.map((positionId) => ({
          position: {
            connect: { id: positionId },
          },
        })),
      };
    }

    if (processIds.length > 0) {
      data.processLinks = {
        create: processIds.map((processId) => ({
          process: {
            connect: { id: processId },
          },
        })),
      };
    }

    if (taskIds.length > 0) {
      data.taskLinks = {
        create: taskIds.map((taskId) => ({
          task: {
            connect: { id: taskId },
          },
        })),
      };
    }

    try {
      return await this.prisma.test.create({
        data,
        include: this.testInclude,
      });
    } catch (error) {
      this.handlePrismaError(error, 'Тест с таким названием уже существует');
    }
  }

  async findAll(userId: number) {
    return this.prisma.test.findMany({
      where: { userId },
      include: this.testInclude,
      orderBy: [{ id: 'asc' }],
    });
  }

  async findOne(id: number, userId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: this.testInclude,
    });

    if (!test) {
      throw new NotFoundException(`Тест с id ${id} не найден`);
    }

    if (test.userId !== userId) {
      throw new ForbiddenException('Нет доступа к тесту');
    }

    return test;
  }

  async findStats(id: number, userId: number) {
    await this.ensureTestAccess(id, userId);

    const test = await this.prisma.test.findUnique({
      where: { id },
      include: {
        employeeLinks: {
          include: {
            employee: {
              include: {
                position: { select: { id: true, name: true } },
                userAccount: {
                  select: {
                    id: true,
                    login: true,
                    email: true,
                    actorType: true,
                  },
                },
              },
            },
          },
        },
        positionLinks: {
          include: {
            position: { select: { id: true, name: true } },
          },
        },
        processLinks: {
          include: {
            process: {
              select: {
                id: true,
                name: true,
                responsibleEmployeeId: true,
                responsiblePositionId: true,
              },
            },
          },
        },
        taskLinks: {
          include: {
            task: {
              select: {
                id: true,
                name: true,
                processId: true,
                responsibleEmployeeId: true,
                responsiblePositionId: true,
              },
            },
          },
        },
        questions: {
          select: {
            id: true,
            type: true,
            isRequired: true,
          },
        },
        results: {
          orderBy: [{ updatedAt: 'desc' }],
          include: {
            user: {
              select: {
                id: true,
                login: true,
                email: true,
                actorType: true,
                employeeProfile: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    position: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            answers: {
              include: {
                question: {
                  select: {
                    id: true,
                    order: true,
                    title: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`Тест с id ${id} не найден`);
    }

    const directEmployeeIdSet = new Set(
      test.employeeLinks.map((link) => link.employeeId),
    );
    const positionIdSet = new Set(test.positionLinks.map((link) => link.positionId));

    const linkedProcesses = test.processLinks.map((link) => link.process);
    const linkedTasks = test.taskLinks.map((link) => link.task);

    const allEmployees = await this.prisma.employee.findMany({
      where: { userId },
      include: {
        position: {
          select: { id: true, name: true },
        },
        userAccount: {
          select: {
            id: true,
            login: true,
            email: true,
            actorType: true,
          },
        },
      },
      orderBy: [{ fullName: 'asc' }],
    });

    const resultsByUserId = new Map(test.results.map((result) => [result.userId, result]));

    const assignedEmployees = allEmployees
      .map((employee) => {
        const byDirectLink = directEmployeeIdSet.has(employee.id);
        const byPositionLink = Boolean(
          employee.positionId !== null && employee.positionId !== undefined
          && positionIdSet.has(employee.positionId),
        );

        const processMatches = linkedProcesses
          .filter((process) =>
            process.responsibleEmployeeId === employee.id
            || (
              employee.positionId !== null
              && employee.positionId !== undefined
              && process.responsiblePositionId === employee.positionId
            ))
          .map((process) => ({
            id: process.id,
            name: process.name,
          }));

        const taskMatches = linkedTasks
          .filter((task) =>
            task.responsibleEmployeeId === employee.id
            || (
              employee.positionId !== null
              && employee.positionId !== undefined
              && task.responsiblePositionId === employee.positionId
            ))
          .map((task) => ({
            id: task.id,
            name: task.name,
          }));

        const isAssigned = byDirectLink || byPositionLink || processMatches.length > 0 || taskMatches.length > 0;
        if (!isAssigned) return null;

        const accountUserId = employee.userAccount?.id;
        const accountResult = accountUserId ? resultsByUserId.get(accountUserId) : null;

        return {
          employee: {
            id: employee.id,
            fullName: employee.fullName,
            email: employee.email,
            position: employee.position
              ? {
                  id: employee.position.id,
                  name: employee.position.name,
                }
              : null,
            account: employee.userAccount
              ? {
                  id: employee.userAccount.id,
                  login: employee.userAccount.login,
                  email: employee.userAccount.email,
                }
              : null,
          },
          assignmentReasons: {
            byDirectLink,
            byPositionLink,
            byProcesses: processMatches,
            byTasks: taskMatches,
          },
          hasPassed: Boolean(accountResult),
          result: accountResult
            ? {
                id: accountResult.id,
                score: accountResult.score,
                correctAnswers: accountResult.correctAnswers,
                evaluatedQuestions: accountResult.evaluatedQuestions,
                totalQuestions: accountResult.totalQuestions,
                percentage: accountResult.percentage,
                durationSeconds: accountResult.durationSeconds,
                hintsUsed: accountResult.hintsUsed,
                hintsTotal: accountResult.hintsTotal,
                updatedAt: accountResult.updatedAt.toISOString(),
              }
            : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const percentages = test.results
      .map((result) => result.percentage)
      .filter((value) => Number.isFinite(value));
    const averagePercentage = percentages.length > 0
      ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100) / 100
      : 0;

    return {
      test: {
        id: test.id,
        name: test.name,
        description: test.description,
        timeLimitMinutes: test.timeLimitMinutes,
        createdAt: test.createdAt.toISOString(),
        updatedAt: test.updatedAt.toISOString(),
        questionStats: {
          total: test.questions.length,
          required: test.questions.filter((question) => question.isRequired).length,
          byType: {
            single_choice: test.questions.filter((question) => question.type === 'single_choice').length,
            multiple_choice: test.questions.filter((question) => question.type === 'multiple_choice').length,
            text: test.questions.filter((question) => question.type === 'text').length,
          },
        },
        links: {
          employees: test.employeeLinks.map((link) => ({
            id: link.employeeId,
            fullName: link.employee.fullName,
          })),
          positions: test.positionLinks.map((link) => ({
            id: link.positionId,
            name: link.position.name,
          })),
          processes: test.processLinks.map((link) => ({
            id: link.processId,
            name: link.process.name,
          })),
          tasks: test.taskLinks.map((link) => ({
            id: link.taskId,
            name: link.task.name,
            processId: link.task.processId,
          })),
        },
      },
      assignment: {
        assignedEmployeesCount: assignedEmployees.length,
        passedEmployeesCount: assignedEmployees.filter((item) => item.hasPassed).length,
        notPassedEmployeesCount: assignedEmployees.filter((item) => !item.hasPassed).length,
        assignedEmployees,
      },
      summary: {
        totalResults: test.results.length,
        averagePercentage,
        maxPercentage: percentages.length > 0 ? Math.max(...percentages) : 0,
        minPercentage: percentages.length > 0 ? Math.min(...percentages) : 0,
      },
      results: test.results.map((result) => ({
        id: result.id,
        userId: result.userId,
        user: {
          id: result.user.id,
          login: result.user.login,
          email: result.user.email,
          actorType: result.user.actorType,
          employeeProfile: result.user.employeeProfile
            ? {
                id: result.user.employeeProfile.id,
                fullName: result.user.employeeProfile.fullName,
                email: result.user.employeeProfile.email,
                position: result.user.employeeProfile.position
                  ? {
                      id: result.user.employeeProfile.position.id,
                      name: result.user.employeeProfile.position.name,
                    }
                  : null,
              }
            : null,
        },
        score: result.score,
        correctAnswers: result.correctAnswers,
        evaluatedQuestions: result.evaluatedQuestions,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        durationSeconds: result.durationSeconds,
        hintsUsed: result.hintsUsed,
        hintsTotal: result.hintsTotal,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        answers: result.answers
          .sort((a, b) => a.question.order - b.question.order)
          .map((answer) => ({
            questionId: answer.questionId,
            questionOrder: answer.question.order,
            questionTitle: answer.question.title,
            questionType: answer.question.type,
            selectedOptionIds: answer.selectedOptionIds,
            textAnswer: answer.textAnswer,
            isCorrect: answer.isCorrect,
            usedHint: answer.usedHint,
          })),
      })),
    };
  }

  async findMyResult(id: number, userId: number) {
    await this.ensureTestAccess(id, userId);

    return this.prisma.testResult.findUnique({
      where: {
        testId_userId: {
          testId: id,
          userId,
        },
      },
      include: {
        answers: {
          orderBy: {
            question: {
              order: 'asc',
            },
          },
          include: {
            question: {
              select: {
                id: true,
                title: true,
                type: true,
                order: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllForEmployee(user: CurrentUserData) {
    const context = await this.getEmployeeTestAccessContext(user);

    const tests = await this.prisma.test.findMany({
      where: this.buildEmployeeTestWhereInput(context),
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                text: true,
                order: true,
              },
            },
          },
        },
        _count: {
          select: {
            employeeLinks: true,
            positionLinks: true,
            processLinks: true,
            taskLinks: true,
          },
        },
        results: {
          where: { userId: user.id },
          select: {
            id: true,
            score: true,
            correctAnswers: true,
            evaluatedQuestions: true,
            totalQuestions: true,
            percentage: true,
            durationSeconds: true,
            hintsUsed: true,
            hintsTotal: true,
            updatedAt: true,
          },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return tests.map((test) => this.sanitizeTestForEmployee({
      ...test,
      myResult: test.results[0] ?? null,
      results: undefined,
    }));
  }

  async findOneForEmployee(id: number, user: CurrentUserData) {
    const context = await this.getEmployeeTestAccessContext(user);

    const test = await this.prisma.test.findFirst({
      where: {
        id,
        ...this.buildEmployeeTestWhereInput(context),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                text: true,
                order: true,
              },
            },
          },
        },
        _count: {
          select: {
            employeeLinks: true,
            positionLinks: true,
            processLinks: true,
            taskLinks: true,
          },
        },
      },
    });

    if (!test) {
      throw new ForbiddenException('Нет доступа к этому тесту');
    }

    return this.sanitizeTestForEmployee(test);
  }

  async findMyResultForEmployee(id: number, user: CurrentUserData) {
    const context = await this.getEmployeeTestAccessContext(user);

    const test = await this.prisma.test.findFirst({
      where: {
        id,
        ...this.buildEmployeeTestWhereInput(context),
      },
      select: { id: true },
    });

    if (!test) {
      throw new ForbiddenException('Нет доступа к этому тесту');
    }

    return this.prisma.testResult.findUnique({
      where: {
        testId_userId: {
          testId: id,
          userId: user.id,
        },
      },
      include: {
        answers: {
          orderBy: {
            question: {
              order: 'asc',
            },
          },
          include: {
            question: {
              select: {
                id: true,
                title: true,
                type: true,
                order: true,
              },
            },
          },
        },
      },
    });
  }

  async passTestForEmployee(
    testId: number,
    dto: SubmitTestDto,
    user: CurrentUserData,
  ) {
    const context = await this.getEmployeeTestAccessContext(user);

    const test = await this.prisma.test.findFirst({
      where: {
        id: testId,
        ...this.buildEmployeeTestWhereInput(context),
      },
      select: { id: true, userId: true },
    });

    if (!test) {
      throw new ForbiddenException('Нет доступа к этому тесту');
    }

    try {
      return await this.executeTestPass({
        testId,
        dto,
        testOwnerUserId: context.ownerUserId,
        resultUserId: user.id,
        allowRetake: false,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
      ) {
        throw new ConflictException('Тест можно пройти только один раз');
      }
      throw error;
    }
  }

  async passTest(testId: number, dto: SubmitTestDto, userId: number) {
    return this.executeTestPass({
      testId,
      dto,
      testOwnerUserId: userId,
      resultUserId: userId,
      allowRetake: true,
    });
  }

  async update(id: number, dto: UpdateTestDto, userId: number) {
    await this.ensureTestAccess(id, userId);

    const employeeIds = dto.employeeIds ? this.normalizeIds(dto.employeeIds) ?? [] : undefined;
    const positionIds = dto.positionIds ? this.normalizeIds(dto.positionIds) ?? [] : undefined;
    const processIds = dto.processIds ? this.normalizeIds(dto.processIds) ?? [] : undefined;
    const taskIds = dto.taskIds ? this.normalizeIds(dto.taskIds) ?? [] : undefined;

    const questions = dto.questions ? this.normalizeQuestions(dto.questions) : undefined;

    if (questions) {
      this.validateQuestions(questions);
    }

    if (employeeIds !== undefined) {
      await this.ensureEmployeesAccess(employeeIds, userId);
    }
    if (positionIds !== undefined) {
      await this.ensurePositionsAccess(positionIds, userId);
    }
    if (processIds !== undefined) {
      await this.ensureProcessesAccess(processIds, userId);
    }
    if (taskIds !== undefined) {
      await this.ensureTasksAccess(taskIds, userId);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.test.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            description: dto.description?.trim(),
            timeLimitMinutes: dto.timeLimitMinutes,
          },
        });

        if (questions !== undefined) {
          await tx.testQuestion.deleteMany({ where: { testId: id } });

          for (const question of questions) {
            await tx.testQuestion.create({
              data: {
                testId: id,
                type: question.type,
                title: question.title,
                description: question.description,
                order: question.order,
                isRequired: question.isRequired,
                textAnswerPlaceholder: question.textAnswerPlaceholder,
                expectedTextAnswer: question.expectedTextAnswer,
                options:
                  question.options.length > 0
                    ? {
                        create: question.options.map((option) => ({
                          text: option.text,
                          isCorrect: option.isCorrect,
                          order: option.order,
                        })),
                      }
                    : undefined,
              },
            });
          }
        }

        if (employeeIds !== undefined) {
          await tx.testEmployee.deleteMany({ where: { testId: id } });
          if (employeeIds.length > 0) {
            await tx.testEmployee.createMany({
              data: employeeIds.map((employeeId) => ({
                testId: id,
                employeeId,
              })),
            });
          }
        }

        if (positionIds !== undefined) {
          await tx.testPosition.deleteMany({ where: { testId: id } });
          if (positionIds.length > 0) {
            await tx.testPosition.createMany({
              data: positionIds.map((positionId) => ({
                testId: id,
                positionId,
              })),
            });
          }
        }

        if (processIds !== undefined) {
          await tx.testProcess.deleteMany({ where: { testId: id } });
          if (processIds.length > 0) {
            await tx.testProcess.createMany({
              data: processIds.map((processId) => ({
                testId: id,
                processId,
              })),
            });
          }
        }

        if (taskIds !== undefined) {
          await tx.testTask.deleteMany({ where: { testId: id } });
          if (taskIds.length > 0) {
            await tx.testTask.createMany({
              data: taskIds.map((taskId) => ({
                testId: id,
                taskId,
              })),
            });
          }
        }
      });

      return this.findOne(id, userId);
    } catch (error) {
      this.handlePrismaError(error, 'Тест с таким названием уже существует');
    }
  }

  async remove(id: number, userId: number) {
    await this.ensureTestAccess(id, userId);
    return this.prisma.test.delete({ where: { id } });
  }
}
