import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@school-copilot/shared';

export interface AuthenticatedUser extends JwtPayload {
  id: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return null;
    }
    return data ? user[data] : user;
  },
);
