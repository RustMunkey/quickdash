import { pgTable, text, uuid, decimal, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { workspaces } from "./workspaces";

export const payments = pgTable("payments", {
	id: uuid("id").primaryKey().defaultRandom(),
	workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
	orderId: uuid("order_id")
		.notNull()
		.references(() => orders.id),
	method: text("method").notNull(),
	provider: text("provider").notNull(),
	status: text("status").notNull().default("pending"),
	amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
	currency: text("currency").notNull().default("USD"),
	externalId: text("external_id"),
	providerData: jsonb("provider_data")
		.$type<Record<string, unknown>>()
		.default({}),
	chainId: text("chain_id"),
	walletAddress: text("wallet_address"),
	txHash: text("tx_hash"),
	paidAt: timestamp("paid_at"),
	refundedAt: timestamp("refunded_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
	index("payments_workspace_idx").on(table.workspaceId),
]);
