import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().url(),
		REDIS_URL: z.string().url(),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url(),
		GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
		INITIAL_ADMIN_EMAILS: z.string().optional(),
		PUSHER_APP_ID: z.string().optional(),
		PUSHER_KEY: z.string().optional(),
		PUSHER_SECRET: z.string().optional(),
		PUSHER_CLUSTER: z.string().optional(),
		LIVEKIT_API_KEY: z.string().optional(),
		LIVEKIT_API_SECRET: z.string().optional(),
		LIVEKIT_URL: z.string().optional(),
		// Webhook secrets
		POLAR_WEBHOOK_SECRET: z.string().optional(),
		RESEND_WEBHOOK_SECRET: z.string().optional(),
		// Tracking service (17track.net)
		TRACK17_API_KEY: z.string().optional(),
	},
	client: {
		NEXT_PUBLIC_ADMIN_URL: z.string().url(),
		NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
		NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
	},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		REDIS_URL: process.env.REDIS_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		INITIAL_ADMIN_EMAILS: process.env.INITIAL_ADMIN_EMAILS,
		PUSHER_APP_ID: process.env.PUSHER_APP_ID,
		PUSHER_KEY: process.env.PUSHER_KEY,
		PUSHER_SECRET: process.env.PUSHER_SECRET,
		PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
		LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
		LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
		LIVEKIT_URL: process.env.LIVEKIT_URL,
		POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
		RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
		TRACK17_API_KEY: process.env.TRACK17_API_KEY,
		NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
		NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
		NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
