import {
	pgTable,
	text,
	uuid,
	decimal,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { orders } from "./orders";
import { workspaces } from "./workspaces";

export const giftCards = pgTable(
	"gift_cards",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		code: text("code").notNull(), // Unique per workspace, not globally
	initialBalance: decimal("initial_balance", { precision: 10, scale: 2 }).notNull(),
	currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).notNull(),
	issuedTo: text("issued_to").references(() => users.id),
	issuedBy: text("issued_by")
		.notNull()
		.references(() => users.id),
		status: text("status").notNull().default("active"),
		expiresAt: timestamp("expires_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("gift_cards_workspace_idx").on(table.workspaceId),
	]
);

export const giftCardTransactions = pgTable("gift_card_transactions", {
	id: uuid("id").primaryKey().defaultRandom(),
	giftCardId: uuid("gift_card_id")
		.notNull()
		.references(() => giftCards.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
	orderId: uuid("order_id").references(() => orders.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
