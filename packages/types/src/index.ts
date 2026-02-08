// Product source types
export type SourceType = "owned" | "dropship" | "white_label";

// Product categories
export type ProductCategory =
	| "coffee"
	| "matcha"
	| "gear"
	| "apparel"
	| "skate";

// Discount types
export type DiscountType =
	| "subscription"
	| "senior"
	| "developer"
	| "veteran"
	| "promo";

// Discount value types
export type DiscountValueType = "percentage" | "fixed";

// Order status
export type OrderStatus =
	| "pending"
	| "confirmed"
	| "processing"
	| "shipped"
	| "delivered"
	| "cancelled"
	| "refunded";

// Payment
export type PaymentMethod = "fiat" | "crypto";
export type PaymentProvider = "polar" | "reown";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

// Subscription
export type SubscriptionFrequency = "weekly" | "biweekly" | "monthly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

// Inventory
export type InventoryLogReason =
	| "sale"
	| "restock"
	| "adjustment"
	| "return"
	| "damage";

// Weight units
export type WeightUnit = "oz" | "lb" | "g" | "kg";
