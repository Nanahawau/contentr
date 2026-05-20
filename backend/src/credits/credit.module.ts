import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import {
  CreditTransaction,
  CreditTransactionSchema,
} from './schemas/credit-transaction.schema';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { SystemConfigModule } from '../system-config/system-config.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import defaultConfig from '../config/default.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CreditTransaction.name, schema: CreditTransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    SystemConfigModule,
    ConfigModule.forFeature(defaultConfig),
  ],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
