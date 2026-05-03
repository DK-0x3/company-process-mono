import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserData } from './current-user.interface';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserData | undefined;
    return user ?? null;
  },
);
