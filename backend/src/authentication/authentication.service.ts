import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService, UserObject } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import jwtConfig from 'src/config/jwt.config';
import emailConfig from 'src/config/email.config';
import { LoginDto } from '../user/dtos/login.dto';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { EmailService } from '../email/email.service';

type AuthTokens = {
  user: UserObject;
  access_token: string;
  refresh_token: string;
};

type JwtPayload = {
  sub: string;
  email: string;
  verified: boolean;
};

type EmailVerificationPayload = {
  sub: string;
};

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @Inject(emailConfig.KEY)
    private readonly emailConfiguration: ConfigType<typeof emailConfig>,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<UserObject> {
    return this.userService.create(createUserDto);
  }

  async login(
    loginDto: LoginDto,
    provider: string = 'default',
  ): Promise<AuthTokens> {
    const foundUser = await this.userService.findOne(loginDto.email, provider);
    if (!foundUser) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await this.userService.isValidPassword(
      foundUser.password,
      loginDto.password,
    );
    if (!passwordMatches)
      throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(this.userService.userObject(foundUser));
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.jwtConfiguration.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const foundUser = await this.userService.findById(payload.sub);
    if (!foundUser) throw new UnauthorizedException('Invalid refresh token');

    return this.generateTokens(this.userService.userObject(foundUser));
  }

  async sendVerificationEmail(userObject: UserObject): Promise<void> {
    const token = this.jwtService.sign(
      { sub: userObject.id },
      {
        secret: this.jwtConfiguration.emailVerificationSecret,
        expiresIn: this.jwtConfiguration.emailVerificationExpiry,
      },
    );
    const verificationUrl = `${this.emailConfiguration.appUrl}/verify-email?token=${token}`;
    await this.emailService.sendVerificationEmail(
      userObject.email,
      verificationUrl,
    );
  }

  async verifyEmail(token: string): Promise<void> {
    let payload: EmailVerificationPayload;

    try {
      payload = this.jwtService.verify<EmailVerificationPayload>(token, {
        secret: this.jwtConfiguration.emailVerificationSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired verification link');
    }

    await this.userService.markVerified(payload.sub);
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const foundUser = await this.userService.findById(userId);
    if (!foundUser) throw new NotFoundException('User not found');
    if (foundUser.verified)
      throw new BadRequestException('Email is already verified');

    await this.sendVerificationEmail(this.userService.userObject(foundUser));
  }

  generateTokensForOAuth(userObject: UserObject): AuthTokens {
    return this.generateTokens(userObject);
  }

  private generateTokens(userObject: UserObject): AuthTokens {
    const payload: JwtPayload = {
      sub: userObject.id,
      email: userObject.email,
      verified: userObject.verified,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtConfiguration.secret,
      expiresIn: this.jwtConfiguration.accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtConfiguration.refreshSecret,
      expiresIn: this.jwtConfiguration.refreshTokenExpiry,
    });

    return {
      user: userObject,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
