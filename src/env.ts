import { env_schema } from "../env-schema";

export const env = env_schema.parse(process.env);
export default env;
