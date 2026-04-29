import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_METADATA = 'responseMessage';
export const CustomMessage = (...args: string[]) =>
  SetMetadata(RESPONSE_MESSAGE_METADATA, args);
