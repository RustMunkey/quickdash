import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().url(),
		REDIS_URL: z.string().url(),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url(),
		PUSHER_APP_ID: z.string().optional(),
		PUSHER_KEY: z.string().optional(),
		PUSHER_SECRET: z.string().optional(),
		PUSHER_CLUSTER: z.string().optional(),
		POLAR_ACCESS_TOKEN: z.string().optional(),
		POLAR_WEBHOOK_SECRET: z.string().optional(),
		// Email
		RESEND_API_KEY: z.string().optional(),
		// Sentry
		SENTRY_DSN: z.string().optional(),
	},
	client: {
		NEXT_PUBLIC_APP_URL: z.string().url(),
		NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
		NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
		NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
		NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().optional(),
	},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		REDIS_URL: process.env.REDIS_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		PUSHER_APP_ID: process.env.PUSHER_APP_ID,
		PUSHER_KEY: process.env.PUSHER_KEY,
		PUSHER_SECRET: process.env.PUSHER_SECRET,
		PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
		POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
		POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		SENTRY_DSN: process.env.SENTRY_DSN,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
		NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
		NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
