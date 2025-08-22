import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Public base URL for the API (used in generated form HTML)
  API_URL: z.string().url().optional(),
  LOCAL_API_URL: z.string().url().optional(),
  // Email/Notifications (optional for local/dev)
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Queues / Integrations
  RAILWAY_REDDIS_URL: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
});

export const env = Env.parse(process.env);
