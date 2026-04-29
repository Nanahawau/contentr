import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from '../user/dtos/create-user.dto';
// import { SocialsOauthGuard } from './guard/socials-oauth.guard';
import { Public } from 'src/common/decorator/public.decorator';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  @Public()
  async register(@Body() user: CreateUserDto) {
    return this.authenticationService.register(user);
  }
  @Post('login')
  @Public()
  async login(@Body() user: CreateUserDto) {
    return this.authenticationService.login(user);
  }
  // @Get('socials/google')
  // @UseGuards(SocialsOauthGuard)
  // async socialAuthenticate() {}

  // @Get('socials/google/redirect')
  // @UseGuards(SocialsOauthGuard)
  // async socialRedirect(@Body() user: any) {
  //   // todo: add type of user
  //   return this.authenticationService.sign(user);
  // }
}
