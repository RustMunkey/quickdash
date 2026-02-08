import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const addresses = pgTable("addresses", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	label: text("label"),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	company: text("company"),
	addressLine1: text("address_line_1").notNull(),
	addressLine2: text("address_line_2"),
	city: text("city").notNull(),
	state: text("state").notNull(),
	postalCode: text("postal_code").notNull(),
	country: text("country").notNull().default("US"),
	phone: text("phone"),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
