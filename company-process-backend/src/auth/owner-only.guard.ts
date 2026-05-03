import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserData } from './current-user.interface';

@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserData | undefined;

    if (!user) {
      throw new ForbiddenException('Пользователь не авторизован');
    }

    if (user.actorType !== 'OWNER') {
      throw new ForbiddenException('Доступ разрешен только владельцу workspace');
    }

    return true;
  }
}
