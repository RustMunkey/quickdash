import { randomUUID } from "crypto";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const invites = pgTable("invites", {
	id: text("id").primaryKey().$defaultFn(() => randomUUID()),
	email: text("email").notNull().unique(),
	role: text("role").notNull().default("member"),
	invitedBy: text("invited_by").references(() => users.id, {
		onDelete: "set null",
	}),
	status: text("status").notNull().default("pending"),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
