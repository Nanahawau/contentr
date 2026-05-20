import { Controller, Get } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

type AuthenticatedUser = { id: string; email: string; verified: boolean };

@Controller('credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get('history')
  findHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.creditService.findHistory(user.id);
  }
}
