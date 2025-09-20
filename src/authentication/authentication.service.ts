import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthenticationService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    user: { email: string; password: string },
    provider = 'default',
  ) {
    const { email, password } = user;
    const foundUser = await this.userService.findOne({ email, provider });

    const isValidUser =
      foundUser &&
      (await this.userService.isValidPassword(password, foundUser.password));

    return isValidUser ? this.userService.userObject(foundUser) : null;
  }

  async login(user: { email: string; password: string }, provider = 'default') {
    const validUser = await this.validateUser(user, provider);

    if (!validUser) throw new NotFoundException('User not found');

    return {
      user: validUser,
      access_token: this.jwtService.sign(validUser),
    };
  }

  async register(user: { email: string; password: string }) {
    return this.userService.create(user);
  }

  async sign(user: any) {
    return {
      user,
      access_token: this.jwtService.sign(user),
    }
  }
}
