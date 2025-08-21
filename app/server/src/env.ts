import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  REDDIS_HOST: z.string().optional(),
  REDDIS_TOKEN: z.string().optional(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
  RAILWAY_REDDIS_URL: z.string().optional(),

  

  SLACK_WEBHOOK_URL: z.string().optional(),
});

export const env = Env.parse(process.env);
