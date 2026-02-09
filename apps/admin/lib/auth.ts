import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@quickdash/db/client";
import { eq, count } from "@quickdash/db/drizzle";
import { users, sessions, accounts, verifications, auditLog } from "@quickdash/db/schema";
import { Resend } from "resend";

export const auth = betterAuth({
	baseURL: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001",
	secret: process.env.BETTER_AUTH_SECRET,
	trustedOrigins: [
		process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001",
		"http://localhost:3001",
		"https://app.quickdash.net",
	],
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: users,
			session: sessions,
			account: accounts,
			verification: verifications,
		},
	}),
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			prompt: "select_account",
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		},
	},
	session: {
		expiresIn: 60 * 60 * 24, // 24 hours
		updateAge: 60 * 60, // refresh token every hour of activity
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // cache session for 5 min (avoids DB hit every request)
		},
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				defaultValue: "member",
				input: false,
			},
			username: {
				type: "string",
				required: false,
				input: false,
			},
			bannerImage: {
				type: "string",
				required: false,
				input: false,
			},
			onboardingCompletedAt: {
				type: "date",
				required: false,
				input: false,
			},
		},
	},
	databaseHooks: {
		session: {
			create: {
				after: async (session) => {
					// Log sign-in to audit log
					const [user] = await db
						.select({ name: users.name, email: users.email })
						.from(users)
						.where(eq(users.id, session.userId))
						.limit(1);

					if (user) {
						await db.insert(auditLog).values({
							userId: session.userId,
							userName: user.name,
							userEmail: user.email,
							action: "auth.sign_in",
							ipAddress: session.ipAddress ?? null,
							metadata: {
								userAgent: session.userAgent,
							},
						}).catch(() => {});
					}
				},
			},
		},
		user: {
			create: {
				before: async (user) => {
					const email = user.email;

					// Check if this is an initial admin bootstrap (platform owners)
					const initialEmails = process.env.INITIAL_ADMIN_EMAILS
						?.split(",")
						.map((e) => e.trim().toLowerCase());
					if (initialEmails?.includes(email.toLowerCase())) {
						const [ownerCount] = await db
							.select({ count: count() })
							.from(users)
							.where(eq(users.role, "owner"));
						if (Number(ownerCount.count) < initialEmails.length) {
							return {
								data: {
									...user,
									role: "owner",
								},
							};
						}
					}

					// Anyone can sign up - they'll go through onboarding
					// Workspace invites are handled separately after onboarding
					return {
						data: {
							...user,
							role: "member",
						},
					};
				},
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		sendResetPassword: async ({ user, url }) => {
			const resend = new Resend(process.env.RESEND_API_KEY);
			await resend.emails.send({
				from: "Quickdash <noreply@quickdash.net>",
				to: user.email,
				subject: "Reset your password",
				html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
			});
		},
	},
	plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
