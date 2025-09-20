import * as process from "node:process";
import {registerAs} from "@nestjs/config";

export default registerAs('defaultConfig', () => ({
    port: parseInt(process.env.PORT || '') || 3000,
    jwtSecret: process.env.JWT_SECRET,
}));