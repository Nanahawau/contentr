import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import {CreateUserDto} from "../user/dtos/create-user.dto";
import {SocialsOauthGuard} from "./guard/socials-oauth.guard";

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  async register(@Body() user: CreateUserDto) {
    return this.authenticationService.register(user);
  }
  @Post('login')
  async login(@Body() user: CreateUserDto) {
    return this.authenticationService.register(user);
  }
  @Get('socials/google')
  @UseGuards(SocialsOauthGuard)
  async socialAuthenticate() {}

  @Get('socials/google/redirect')
  @UseGuards(SocialsOauthGuard)
  async socialRedirect(@Body() user: any) {  // todo: add type of user
    return this.authenticationService.sign(user)
  }
}
