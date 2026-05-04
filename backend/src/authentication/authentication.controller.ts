import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { LoginDto } from '../user/dtos/login.dto';
import { Public } from 'src/common/decorator/public.decorator';
import { SocialsOauthGuard } from './guard/socials-oauth.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserObject } from '../user/user.service';
import { VerifyEmailDto } from './dtos/verify-email.dto';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  @Public()
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authenticationService.register(createUserDto);
    await this.authenticationService.sendVerificationEmail(user);
    return user;
  }

  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { refresh_token, ...result } = await this.authenticationService.login(loginDto);
    response.cookie(REFRESH_TOKEN_COOKIE, refresh_token, refreshCookieOptions);
    return result;
  }

  @Post('refresh')
  @Public()
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as string;
    if (!refreshToken) throw new Error('No refresh token provided');

    const { refresh_token, ...result } = await this.authenticationService.refresh(refreshToken);
    response.cookie(REFRESH_TOKEN_COOKIE, refresh_token, refreshCookieOptions);
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(REFRESH_TOKEN_COOKIE);
  }

  @Post('verify-email')
  @Public()
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authenticationService.verifyEmail(verifyEmailDto.token);
  }

  @Post('resend-verification')
  async resendVerification(@CurrentUser() currentUser: UserObject) {
    await this.authenticationService.resendVerificationEmail(currentUser.id);
  }

  @Get('google')
  @Public()
  @UseGuards(SocialsOauthGuard)
  googleLogin() {}

  @Get('google/callback')
  @Public()
  @UseGuards(SocialsOauthGuard)
  googleCallback(@CurrentUser() userObject: UserObject, @Res({ passthrough: true }) response: Response) {
    const { refresh_token, ...result } = this.authenticationService.generateTokensForOAuth(userObject);
    response.cookie(REFRESH_TOKEN_COOKIE, refresh_token, refreshCookieOptions);
    return result;
  }
}