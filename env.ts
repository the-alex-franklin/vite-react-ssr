import { env_schema } from "./env-schema";
import { config } from "dotenv";
config();

export const env = env_schema.parse(process.env);
export default env;
