import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

type AuthenticatedUser = { id: string; email: string };

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getProfile(@CurrentUser() authenticatedUser: AuthenticatedUser) {
    return this.userService.findById(authenticatedUser.id);
  }
}
