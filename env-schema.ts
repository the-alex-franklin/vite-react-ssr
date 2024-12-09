import { z } from 'zod';

export const env_schema = z.object({
  RUNESMITH_URL: z.string(),
});
