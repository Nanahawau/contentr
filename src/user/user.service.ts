import { Injectable } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  /**
   * Finds a user by email and provider.
   * @param user
   */
  async findOne(user: { email: string; provider: string }) {
    const { email, provider = 'default' } = user;
    const foundUser = await this.userModel.findOne({ email, provider });

    return foundUser || null;
  }

  /**
   * Creates user.
   * @param user
   */
  async create(user: any) {
    //TODO: create user dto type
    const createdUser = await this.userModel.create(user);

    return this.userObject(createdUser);
  }

  /**
   * Checks if password is valid
   * @param foundPassword
   * @param providedPassword
   */
  async isValidPassword(
    foundPassword: string,
    providedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(providedPassword, foundPassword);
  }

  /**
   * Returns valid user object
   * @param user
   */
  userObject(user: User) {
    return {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      verified: user.verified,
    };
  }
}
