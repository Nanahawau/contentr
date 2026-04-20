import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

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
  @Prop({ nullable: true })
  password: string;
  @Prop({ nullable: false })
  verified: boolean = false;
  @Prop({ nullable: true })
  first_name?: string;
  @Prop({ nullable: true })
  last_name?: string;
  @Prop({ nullable: false })
  provider?: string = 'default';
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