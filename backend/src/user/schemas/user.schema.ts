import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Credits, CreditsSchema } from './credits.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({
  toJSON: {
    virtuals: true,
    transform: function (_doc: any, ret: any) {
      const { _id, __v, password, ...rest } = ret;
      return {
        ...rest,
        id: _id.toString(),
      };
    },
  },
})
export class User {
  @Prop({ required: true, index: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop()
  first_name?: string;

  @Prop()
  last_name?: string;

  @Prop({ default: 'default' })
  provider: string;

  @Prop({ type: CreditsSchema, default: () => ({ balance: 0, reserved: 0, lifetime_used: 0 }) })
  credits: Credits;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});