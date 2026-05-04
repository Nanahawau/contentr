import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { CreateUserDto } from './dtos/create-user.dto';
import { ConfigType } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';

export type UserObject = {
  id: string;
  email: string;
  verified: boolean;
  first_name?: string;
  last_name?: string;
  credits: {
    balance: number;
    reserved: number;
    lifetime_used: number;
  };
};

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(defaultConfig.KEY) private config: ConfigType<typeof defaultConfig>,
  ) {}

  async findOne(
    email: string,
    provider: string = 'default',
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, provider });
  }

  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  async create(
    createUserDto: Omit<CreateUserDto, 'password'> & {
      password?: string;
      provider?: string;
      first_name?: string;
    },
  ): Promise<UserObject> {
    const provider = createUserDto.provider ?? 'default';
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
      provider,
    });

    if (existingUser)
      throw new BadRequestException('User already exists, please log in');

    const createdUser = await this.userModel.create({
      ...createUserDto,
      provider,
      credits: {
        balance: this.config.freeCreditsOnSignup,
        reserved: 0,
        lifetime_used: 0,
      },
    });

    return this.userObject(createdUser);
  }

  async markVerified(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { verified: true });
  }

  async isValidPassword(
    hashedPassword: string,
    plainPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  userObject(userDocument: UserDocument): UserObject {
    const user = userDocument.toJSON<UserDocument & { id: string }>();
    return {
      id: user.id as string,
      email: user.email,
      verified: user.verified,
      first_name: user.first_name,
      last_name: user.last_name,
      credits: user.credits,
    };
  }
}
