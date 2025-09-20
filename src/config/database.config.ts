import { registerAs } from '@nestjs/config';
export default registerAs('databaseConfig', () => ({
    url: process.env.MONGO_URL
}));