import {
	pgTable,
	text,
	uuid,
	timestamp,
	integer,
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const userAudio = pgTable("user_audio", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").references(() => users.id).notNull(),
	name: text("name").notNull(),
	artist: text("artist"),
	url: text("url").notNull(), // Cloudinary or blob storage URL
	duration: integer("duration"), // Duration in seconds
	fileSize: integer("file_size"), // Size in bytes
	mimeType: text("mime_type").default("audio/mpeg"),
	sortOrder: integer("sort_order").default(0).notNull(), // For custom ordering
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
