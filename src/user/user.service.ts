import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { CreateUserDto } from './dtos/create-user.dto';

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
  async create(user: {
    email: string;
    password?: string;
    provider?: string;
    first_name?: string;
  }) {
    const provider = user.provider || 'default';
    const foundUser = await this.userModel.findOne({
      email: user.email,
      provider,
    });

    if (foundUser) {
      throw new BadRequestException('User already exists, please log in');
    }

    const createdUser = await this.userModel.create({ ...user, provider });
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
  userObject(user: any) {
    const userJson = user.toJSON ? user.toJSON() : user;
    return {
      id: userJson.id || user._id?.toString(),
      email: userJson.email || user.email,
      first_name: userJson.first_name || user.first_name,
      last_name: userJson.last_name || user.last_name,
    };
  }
}
