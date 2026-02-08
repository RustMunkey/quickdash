import { config } from "dotenv"
import { resolve } from "path"

// Load env from root .env.local (run from packages/db/)
config({ path: resolve(process.cwd(), "../../.env.local") })
config({ path: resolve(process.cwd(), ".env") })
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL!
if (!connectionString) {
	console.error("DATABASE_URL is not set")
	process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client, { schema })

async function seed() {
	console.log("Seeding database...")

	// --- CLEANUP ---
	console.log("Cleaning existing data...")
	await client.unsafe(`TRUNCATE TABLE
		shipment_tracking, shipping_labels, shipping_zone_rates, shipping_rates, shipping_zones, shipping_carriers,
		purchase_order_items, purchase_orders, suppliers,
		subscription_items, subscriptions,
		gift_card_transactions, gift_cards,
		loyalty_transactions, loyalty_points, loyalty_program,
		customer_segment_members, customer_segments,
		reviews, campaigns,
		inventory_logs, inventory,
		order_notes, order_items, orders,
		payments, addresses, analytics_events, audit_log, discounts,
		referrals, referral_codes,
		product_variants, products, categories,
		messages, email_templates, alert_rules, store_settings,
		blog_posts, site_pages, site_content, media_items,
		sessions, accounts, verifications, invites, users
	CASCADE`)

	// --- CATEGORIES ---
	console.log("Creating categories...")
	const [catEspresso, catBlends, catSingleOrigin, catDecaf, catAccessories] = await db
		.insert(schema.categories)
		.values([
			{ name: "Espresso", slug: "espresso", description: "Rich espresso roasts", sortOrder: 1 },
			{ name: "Blends", slug: "blends", description: "Crafted coffee blends", sortOrder: 2 },
			{ name: "Single Origin", slug: "single-origin", description: "Single origin beans from around the world", sortOrder: 3 },
			{ name: "Decaf", slug: "decaf", description: "Decaffeinated options", sortOrder: 4 },
			{ name: "Accessories", slug: "accessories", description: "Brewing accessories and gear", sortOrder: 5 },
		])
		.returning()

	// --- PRODUCTS ---
	console.log("Creating products...")
	const productData = [
		{ name: "Midnight Espresso", slug: "midnight-espresso", description: "A bold and intense espresso with notes of dark chocolate and caramel. Perfect for those who love a strong, full-bodied cup.", price: "18.99", categoryId: catEspresso.id, tags: ["espresso", "dark-roast", "best-seller"], isActive: true, isFeatured: true, metaTitle: "Midnight Espresso — Bold Dark Roast | Quickdash", metaDescription: "Rich, intense espresso with dark chocolate and caramel notes. Our best-selling dark roast for espresso lovers." },
		{ name: "Italian Roast", slug: "italian-roast", description: "Traditional Italian-style dark roast with smoky undertones and a rich crema.", price: "16.99", categoryId: catEspresso.id, tags: ["espresso", "dark-roast", "italian"], isActive: true, metaTitle: "Italian Roast — Traditional Dark Roast | Quickdash" },
		{ name: "Morning Ritual Blend", slug: "morning-ritual-blend", description: "A smooth, medium-roast blend designed for your daily morning brew. Balanced with notes of honey and toasted almond.", price: "15.99", categoryId: catBlends.id, tags: ["blend", "medium-roast", "best-seller"], isActive: true, isFeatured: true, metaTitle: "Morning Ritual Blend — Smooth Medium Roast | Quickdash", metaDescription: "Start your day with our smooth medium-roast blend. Notes of honey and toasted almond in every cup." },
		{ name: "Velvet Sunset", slug: "velvet-sunset", description: "A velvety smooth blend with hints of dried fruit and brown sugar. Perfect for afternoon sipping.", price: "17.49", categoryId: catBlends.id, tags: ["blend", "medium-roast"], isActive: true },
		{ name: "House Blend Classic", slug: "house-blend-classic", description: "Our signature house blend — reliable, comforting, and always consistent.", price: "14.99", categoryId: catBlends.id, tags: ["blend", "light-roast", "classic"], isActive: true, metaTitle: "House Blend Classic — Our Signature Coffee | Quickdash", metaDescription: "Our signature house blend — reliable, comforting, and always consistent. The perfect everyday coffee." },
		{ name: "Ethiopian Yirgacheffe", slug: "ethiopian-yirgacheffe", description: "Bright and fruity with notes of blueberry, jasmine, and citrus. A light roast from the birthplace of coffee.", price: "21.99", categoryId: catSingleOrigin.id, tags: ["single-origin", "light-roast", "ethiopia"], isActive: true, isFeatured: true, metaTitle: "Ethiopian Yirgacheffe — Single Origin Light Roast | Quickdash", metaDescription: "Bright and fruity Ethiopian coffee with notes of blueberry, jasmine, and citrus. From the birthplace of coffee." },
		{ name: "Colombian Supremo", slug: "colombian-supremo", description: "Full-bodied with a clean finish. Notes of red apple and cocoa from the hills of Huila.", price: "19.99", categoryId: catSingleOrigin.id, tags: ["single-origin", "medium-roast", "colombia"], isActive: true, metaDescription: "Premium Colombian Supremo from the hills of Huila. Full-bodied with notes of red apple and cocoa." },
		{ name: "Sumatra Mandheling", slug: "sumatra-mandheling", description: "Earthy and complex with low acidity. Cedar, dark chocolate, and herbal undertones.", price: "20.49", categoryId: catSingleOrigin.id, tags: ["single-origin", "dark-roast", "indonesia"], isActive: true },
		{ name: "Swiss Water Decaf", slug: "swiss-water-decaf", description: "Chemical-free decaf process. All the flavor of our House Blend without the caffeine.", price: "16.99", categoryId: catDecaf.id, tags: ["decaf", "medium-roast"], isActive: true },
		{ name: "Decaf Espresso", slug: "decaf-espresso", description: "Rich espresso flavor, zero jitters. Great for evening espresso drinks.", price: "17.99", categoryId: catDecaf.id, tags: ["decaf", "espresso", "dark-roast"], isActive: true },
		{ name: "Pour Over Dripper", slug: "pour-over-dripper", description: "Ceramic pour-over dripper for a clean and bright cup. Works with standard #2 filters.", price: "28.00", categoryId: catAccessories.id, tags: ["accessories", "brewing"], isActive: true },
		{ name: "Quickdash Travel Mug", slug: "quickdash-travel-mug", description: "Double-walled stainless steel travel mug. Keeps coffee hot for 6 hours.", price: "24.99", categoryId: catAccessories.id, tags: ["accessories", "merch"], isActive: true },
	]

	const products = await db.insert(schema.products).values(productData).returning()

	// --- VARIANTS ---
	console.log("Creating variants...")
	const variantData: Array<{ productId: string; name: string; sku: string; price: string | null; attributes: Record<string, string> }> = []
	const coffeeProducts = products.filter(p => p.categoryId !== catAccessories.id)
	const sizes = [
		{ name: "12oz Bag", suffix: "12", priceAdd: "0" },
		{ name: "2lb Bag", suffix: "2lb", priceAdd: "8" },
		{ name: "5lb Bag", suffix: "5lb", priceAdd: "22" },
	]
	const grinds = ["Whole Bean", "Coarse", "Medium", "Fine", "Espresso"]

	for (const product of coffeeProducts) {
		for (const size of sizes) {
			const grind = grinds[Math.floor(Math.random() * grinds.length)]
			variantData.push({
				productId: product.id,
				name: `${size.name} - ${grind}`,
				sku: `${product.slug.slice(0, 8).toUpperCase()}-${size.suffix}-${grind.slice(0, 3).toUpperCase()}`,
				price: size.priceAdd === "0" ? null : (parseFloat(product.price) + parseFloat(size.priceAdd)).toFixed(2),
				attributes: { size: size.name, grind },
			})
		}
	}

	// Accessories get color variants
	const mugProduct = products.find(p => p.slug === "quickdash-travel-mug")!
	variantData.push(
		{ productId: mugProduct.id, name: "Matte Black", sku: "MUG-BLK", price: null, attributes: { color: "Black" } },
		{ productId: mugProduct.id, name: "Cream White", sku: "MUG-WHT", price: null, attributes: { color: "White" } },
	)
	const dripperProduct = products.find(p => p.slug === "pour-over-dripper")!
	variantData.push(
		{ productId: dripperProduct.id, name: "White Ceramic", sku: "DRIP-WHT", price: null, attributes: { color: "White" } },
		{ productId: dripperProduct.id, name: "Charcoal", sku: "DRIP-CHR", price: "30.00", attributes: { color: "Charcoal" } },
	)

	const variants = await db.insert(schema.productVariants).values(variantData).returning()

	// --- INVENTORY ---
	console.log("Creating inventory records...")
	const inventoryValues = variants.map((variant) => {
		const qty = Math.floor(Math.random() * 100)
		const reserved = Math.floor(Math.random() * Math.min(qty, 10))
		const threshold = 5 + Math.floor(Math.random() * 15)
		return {
			variantId: variant.id,
			quantity: qty,
			reservedQuantity: reserved,
			lowStockThreshold: threshold,
		}
	})

	// Make a few items low stock or out of stock for alerts
	inventoryValues[0].quantity = 3
	inventoryValues[0].reservedQuantity = 0
	inventoryValues[0].lowStockThreshold = 10
	inventoryValues[1].quantity = 0
	inventoryValues[1].reservedQuantity = 0
	inventoryValues[2].quantity = 7
	inventoryValues[2].reservedQuantity = 5
	inventoryValues[2].lowStockThreshold = 10
	inventoryValues[3].quantity = 0
	inventoryValues[3].reservedQuantity = 0

	await db.insert(schema.inventory).values(inventoryValues)

	// --- INVENTORY LOGS ---
	console.log("Creating inventory logs...")
	const reasons = ["Restock", "Order fulfilled", "Damaged - removed", "Count correction", "Supplier shipment received", "Returned to stock"]
	const logValues = []
	for (let i = 0; i < 40; i++) {
		const variant = variants[Math.floor(Math.random() * variants.length)]
		const prev = Math.floor(Math.random() * 80)
		const change = Math.floor(Math.random() * 40) - 15
		const newQty = Math.max(0, prev + change)
		logValues.push({
			variantId: variant.id,
			previousQuantity: prev,
			newQuantity: newQty,
			reason: reasons[Math.floor(Math.random() * reasons.length)],
			createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
		})
	}
	await db.insert(schema.inventoryLogs).values(logValues)

	// --- MOCK CUSTOMERS ---
	console.log("Creating mock customers...")
	const customerNames = [
		{ name: "Sarah Mitchell", email: "sarah.mitchell@example.com" },
		{ name: "James Rodriguez", email: "james.rodriguez@example.com" },
		{ name: "Emily Chen", email: "emily.chen@example.com" },
		{ name: "Marcus Williams", email: "marcus.williams@example.com" },
		{ name: "Olivia Thompson", email: "olivia.thompson@example.com" },
		{ name: "David Kim", email: "david.kim@example.com" },
		{ name: "Rachel Foster", email: "rachel.foster@example.com" },
		{ name: "Tyler Brooks", email: "tyler.brooks@example.com" },
		{ name: "Chris Newman", email: "chris.newman@example.com" },
	]

	const customers = await db
		.insert(schema.users)
		.values(
			customerNames.map((c, i) => ({
				id: `cust_${String(i + 1).padStart(3, "0")}`,
				name: c.name,
				email: c.email,
				role: "member" as const,
				phone: `+1${String(5550100 + i)}`,
			}))
		)
		.returning()

	// --- ORDERS ---
	console.log("Creating orders...")
	const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "delivered", "delivered", "cancelled", "refunded"]
	const orderValues: Array<{
		orderNumber: string
		userId: string
		status: string
		subtotal: string
		total: string
		taxAmount: string
		trackingNumber: string | null
		shippedAt: Date | null
		deliveredAt: Date | null
		createdAt: Date
	}> = []

	for (let i = 0; i < 25; i++) {
		const customer = customers[Math.floor(Math.random() * customers.length)]
		const status = statuses[Math.floor(Math.random() * statuses.length)]
		const subtotal = (15 + Math.random() * 80).toFixed(2)
		const tax = (parseFloat(subtotal) * 0.08).toFixed(2)
		const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2)
		const daysAgo = Math.floor(Math.random() * 90)
		const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

		orderValues.push({
			orderNumber: `JB-${String(1000 + i).padStart(5, "0")}`,
			userId: customer.id,
			status,
			subtotal,
			total,
			taxAmount: tax,
			trackingNumber: status === "shipped" || status === "delivered" ? `1Z999AA1${String(i).padStart(8, "0")}` : null,
			shippedAt: status === "shipped" || status === "delivered" ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
			deliveredAt: status === "delivered" ? new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000) : null,
			createdAt,
		})
	}

	const insertedOrders = await db.insert(schema.orders).values(orderValues).returning()

	// --- ORDER ITEMS ---
	console.log("Creating order items...")
	const orderItemValues: Array<{
		orderId: string
		variantId: string
		productName: string
		variantName: string
		sku: string
		unitPrice: string
		quantity: number
		totalPrice: string
	}> = []

	for (const order of insertedOrders) {
		const itemCount = 1 + Math.floor(Math.random() * 3)
		for (let j = 0; j < itemCount; j++) {
			const variant = variants[Math.floor(Math.random() * variants.length)]
			const product = products.find(p => p.id === variant.productId)!
			const qty = 1 + Math.floor(Math.random() * 3)
			const unitPrice = variant.price || product.price
			orderItemValues.push({
				orderId: order.id,
				variantId: variant.id,
				productName: product.name,
				variantName: variant.name,
				sku: variant.sku,
				unitPrice,
				quantity: qty,
				totalPrice: (parseFloat(unitPrice) * qty).toFixed(2),
			})
		}
	}

	await db.insert(schema.orderItems).values(orderItemValues)

	// --- REVIEWS ---
	console.log("Creating reviews...")
	const reviewTitles = [
		"Absolutely love this coffee!",
		"Great flavor, smooth finish",
		"Not my favorite, a bit too dark",
		"Perfect morning brew",
		"Best coffee I've ever had",
		"Good value for the quality",
		"Decent but nothing special",
		"Rich and aromatic",
		"Bought this for my office, everyone loves it",
		"Would definitely buy again",
		"Arrived quickly, fresh beans",
		"Too acidic for my taste",
		"My new daily driver",
		"Gift for my dad, he loved it",
		"Excellent with oat milk",
	]
	const reviewBodies = [
		"I've been drinking this for a month now and it's become my go-to. The flavor profile is exactly what I was looking for — bold without being bitter.",
		"Ordered on a whim and was pleasantly surprised. The beans were freshly roasted and the aroma when I opened the bag was incredible.",
		"It's okay but I prefer something with more fruity notes. This one leans more towards chocolate and nutty which isn't my personal preference.",
		"Every morning I look forward to brewing a cup of this. Consistent quality every time I order.",
		"I've tried dozens of online coffee brands and this is hands down the best. The sourcing quality really shows in the cup.",
		"Great quality for the price point. I'd rate it above most grocery store options but below some specialty roasters.",
		"The grind was perfect for my pour-over setup. No complaints about freshness or packaging.",
		"Smooth, well-balanced, and pairs perfectly with a splash of cream. Highly recommend for medium roast fans.",
		"Shared with my coworkers and now three of them have placed their own orders. Says it all!",
		"Fast shipping and the vacuum-sealed bag kept everything super fresh. Will be a repeat customer for sure.",
	]

	const reviewValues = []
	for (let i = 0; i < 15; i++) {
		const product = coffeeProducts[Math.floor(Math.random() * coffeeProducts.length)]
		const customer = customers[Math.floor(Math.random() * customers.length)]
		const statuses = ["pending", "approved", "approved", "approved", "rejected", "reported"]
		const status = statuses[Math.floor(Math.random() * statuses.length)]
		reviewValues.push({
			productId: product.id,
			userId: customer.id,
			rating: 3 + Math.floor(Math.random() * 3), // 3-5 stars
			title: reviewTitles[i],
			body: reviewBodies[i % reviewBodies.length],
			status,
			isVerifiedPurchase: Math.random() > 0.3,
			helpfulCount: Math.floor(Math.random() * 20),
			reportCount: status === "reported" ? 1 + Math.floor(Math.random() * 3) : 0,
			createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
		})
	}

	await db.insert(schema.reviews).values(reviewValues)

	// --- SEGMENTS ---
	console.log("Creating segments...")
	const [segVip, segRepeat, segNewbies] = await db
		.insert(schema.customerSegments)
		.values([
			{ name: "VIP Customers", description: "High-value customers who spend over $200", type: "rule-based", color: "#a855f7", rules: [{ field: "total_spent", operator: ">", value: "200" }] },
			{ name: "Repeat Buyers", description: "Customers with 3+ orders", type: "rule-based", color: "#22c55e", rules: [{ field: "order_count", operator: ">=", value: "3" }] },
			{ name: "New Customers", description: "Joined in the last 30 days", type: "manual", color: "#3b82f6" },
		])
		.returning()

	// Add members to segments
	await db.insert(schema.customerSegmentMembers).values([
		{ segmentId: segVip.id, userId: customers[0].id },
		{ segmentId: segVip.id, userId: customers[2].id },
		{ segmentId: segVip.id, userId: customers[5].id },
		{ segmentId: segRepeat.id, userId: customers[0].id },
		{ segmentId: segRepeat.id, userId: customers[1].id },
		{ segmentId: segRepeat.id, userId: customers[2].id },
		{ segmentId: segRepeat.id, userId: customers[4].id },
		{ segmentId: segRepeat.id, userId: customers[7].id },
		{ segmentId: segNewbies.id, userId: customers[8].id },
		{ segmentId: segNewbies.id, userId: customers[9].id },
	])

	// --- LOYALTY ---
	console.log("Creating loyalty program...")
	await db.insert(schema.loyaltyProgram).values({
		pointsPerDollar: 10,
		pointsRedemptionRate: "0.01",
		tiers: [
			{ name: "Bronze", minPoints: 0, perks: ["Free shipping on orders $50+"] },
			{ name: "Silver", minPoints: 500, perks: ["Free shipping", "10% off accessories"] },
			{ name: "Gold", minPoints: 2000, perks: ["Free shipping", "15% off everything", "Early access to new roasts"] },
		],
		isActive: true,
	})

	const loyaltyValues = [
		{ userId: customers[0].id, points: 2450, lifetimePoints: 3200, tier: "Gold" },
		{ userId: customers[2].id, points: 1800, lifetimePoints: 2100, tier: "Silver" },
		{ userId: customers[5].id, points: 920, lifetimePoints: 1500, tier: "Silver" },
		{ userId: customers[1].id, points: 350, lifetimePoints: 450, tier: "Bronze" },
		{ userId: customers[4].id, points: 680, lifetimePoints: 680, tier: "Silver" },
		{ userId: customers[7].id, points: 200, lifetimePoints: 200, tier: "Bronze" },
	]

	await db.insert(schema.loyaltyPoints).values(loyaltyValues)

	// Loyalty transactions
	const txTypes = ["earned", "earned", "earned", "redeemed", "earned", "adjusted"]
	const txValues = []
	for (let i = 0; i < 20; i++) {
		const customer = loyaltyValues[Math.floor(Math.random() * loyaltyValues.length)]
		const type = txTypes[Math.floor(Math.random() * txTypes.length)]
		const pts = type === "redeemed" ? -(50 + Math.floor(Math.random() * 200)) : 10 + Math.floor(Math.random() * 100)
		txValues.push({
			userId: customer.userId,
			type,
			points: pts,
			description: type === "earned" ? "Order purchase" : type === "redeemed" ? "Points redemption" : "Manual adjustment",
			createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
		})
	}
	await db.insert(schema.loyaltyTransactions).values(txValues)

	// --- GIFT CARDS ---
	console.log("Creating gift cards...")
	// Need an admin user for issuedBy - use the first owner/admin or create one
	// Check if admin user exists
	const { inArray } = await import("drizzle-orm")
	const [adminUser] = await db
		.select()
		.from(schema.users)
		.where(inArray(schema.users.role, ["owner", "admin"]))
		.limit(1)

	const issuerId = adminUser?.id || customers[0].id

	await db.insert(schema.giftCards).values([
		{
			code: "GIFT-WELCOME-2024",
			initialBalance: "50.00",
			currentBalance: "35.50",
			issuedTo: customers[3].id,
			issuedBy: issuerId,
			status: "active",
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		},
		{
			code: "JBHQ-PROMO-FALL",
			initialBalance: "25.00",
			currentBalance: "25.00",
			issuedTo: customers[6].id,
			issuedBy: issuerId,
			status: "active",
			expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
		},
		{
			code: "VIP-REWARD-100",
			initialBalance: "100.00",
			currentBalance: "0.00",
			issuedTo: customers[0].id,
			issuedBy: issuerId,
			status: "used",
		},
		{
			code: "BDAY-SURPRISE-25",
			initialBalance: "25.00",
			currentBalance: "25.00",
			issuedBy: issuerId,
			status: "deactivated",
		},
	])

	// --- SUBSCRIPTIONS ---
	console.log("Creating subscriptions...")
	const frequencies = ["weekly", "biweekly", "monthly", "monthly", "monthly", "bimonthly", "quarterly"]
	const subStatuses = ["active", "active", "active", "active", "cancelled", "paused", "paused", "dunning", "dunning", "dunning"]
	const subscriptionValues: Array<{
		userId: string
		status: string
		frequency: string
		pricePerDelivery: string
		nextDeliveryAt: Date | null
		lastDeliveryAt: Date | null
		totalDeliveries: number
		cancelledAt: Date | null
		cancellationReason: string | null
		createdAt: Date
	}> = []

	for (let i = 0; i < 25; i++) {
		const customer = customers[i % customers.length]
		const frequency = frequencies[Math.floor(Math.random() * frequencies.length)]
		const status = subStatuses[Math.floor(Math.random() * subStatuses.length)]
		const price = (12 + Math.random() * 30).toFixed(2)
		const daysAgo = 10 + Math.floor(Math.random() * 120)
		const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
		const deliveries = Math.floor(daysAgo / (frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : frequency === "monthly" ? 30 : frequency === "bimonthly" ? 60 : 90))
		const lastDeliveryAt = deliveries > 0 ? new Date(Date.now() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000) : null
		const nextDeliveryAt = status === "active" ? new Date(Date.now() + Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000) : null
		const cancelledAt = status === "cancelled" ? new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) : null

		subscriptionValues.push({
			userId: customer.id,
			status,
			frequency,
			pricePerDelivery: price,
			nextDeliveryAt,
			lastDeliveryAt,
			totalDeliveries: deliveries,
			cancelledAt,
			cancellationReason: status === "cancelled" ? ["Too much coffee", "Switching brands", "Budget reasons", "Moving"][Math.floor(Math.random() * 4)] : null,
			createdAt,
		})
	}

	const insertedSubs = await db.insert(schema.subscriptions).values(subscriptionValues).returning()

	// Subscription items
	const coffeeVariants = variants.filter(v => {
		const product = products.find(p => p.id === v.productId)
		return product && product.categoryId !== catAccessories.id
	})
	const subItemValues = insertedSubs.map(sub => ({
		subscriptionId: sub.id,
		variantId: coffeeVariants[Math.floor(Math.random() * coffeeVariants.length)].id,
		quantity: 1 + Math.floor(Math.random() * 2),
	}))

	await db.insert(schema.subscriptionItems).values(subItemValues)

	// --- DISCOUNTS ---
	console.log("Creating discounts...")
	await db.insert(schema.discounts).values([
		{
			name: "Summer Sale 20%",
			code: "SUMMER20",
			discountType: "code",
			valueType: "percentage",
			value: "20.00",
			minimumOrderAmount: "30.00",
			maxUses: 500,
			currentUses: 127,
			isActive: true,
			expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
		},
		{
			name: "New Customer Welcome",
			code: "WELCOME10",
			discountType: "code",
			valueType: "percentage",
			value: "10.00",
			maxUses: null,
			currentUses: 89,
			maxUsesPerUser: 1,
			isActive: true,
		},
		{
			name: "Free Shipping",
			code: "FREESHIP",
			discountType: "code",
			valueType: "fixed",
			value: "8.99",
			minimumOrderAmount: "25.00",
			maxUses: 200,
			currentUses: 200,
			isActive: true,
		},
		{
			name: "Flash Sale 30%",
			code: "FLASH30",
			discountType: "code",
			valueType: "percentage",
			value: "30.00",
			minimumOrderAmount: "50.00",
			maxUses: 100,
			currentUses: 45,
			isActive: false,
			expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
		},
		{
			name: "Loyalty $5 Off",
			code: "LOYAL5",
			discountType: "code",
			valueType: "fixed",
			value: "5.00",
			maxUses: null,
			currentUses: 312,
			isActive: true,
		},
		{
			name: "Holiday Bundle",
			code: "HOLIDAY25",
			discountType: "code",
			valueType: "percentage",
			value: "25.00",
			minimumOrderAmount: "75.00",
			maxUses: 300,
			currentUses: 0,
			isActive: true,
			startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
		},
		{
			name: "Staff Discount",
			code: "STAFF50",
			discountType: "code",
			valueType: "percentage",
			value: "50.00",
			maxUses: null,
			currentUses: 8,
			isStackable: true,
			isActive: true,
		},
		{
			name: "Bulk Order 15%",
			code: "BULK15",
			discountType: "code",
			valueType: "percentage",
			value: "15.00",
			minimumOrderAmount: "100.00",
			maxUses: 50,
			currentUses: 22,
			isActive: true,
		},
	])

	// --- CAMPAIGNS ---
	console.log("Creating campaigns...")
	await db.insert(schema.campaigns).values([
		{
			name: "Spring Sale Announcement",
			description: "Email blast announcing our spring sale with 20% off all blends.",
			type: "email",
			status: "ended",
			subject: "Spring is here — 20% off all blends!",
			content: "Hey coffee lover! Spring has sprung and we're celebrating with 20% off all our signature blends. Use code SPRING20 at checkout.",
			audience: "all",
			discountCode: "SPRING20",
			startedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
			endedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
			recipientCount: 2450,
			sentCount: 2380,
			openCount: 890,
			clickCount: 234,
			conversionCount: 67,
			revenue: "2847.33",
		},
		{
			name: "New Product Launch — Ethiopian Yirgacheffe",
			description: "Announce our new single-origin Ethiopian coffee to VIP customers.",
			type: "email",
			status: "active",
			subject: "Exclusive: New Ethiopian Yirgacheffe is here",
			content: "As one of our VIP customers, you get first access to our newest single-origin: Ethiopian Yirgacheffe. Bright, fruity, and absolutely stunning.",
			audience: "vip",
			startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
			recipientCount: 580,
			sentCount: 565,
			openCount: 312,
			clickCount: 98,
			conversionCount: 31,
			revenue: "681.69",
		},
		{
			name: "Summer Homepage Banner",
			description: "Promotional banner for the summer sale on the homepage.",
			type: "banner",
			status: "active",
			content: "Summer Sale — Up to 30% off select blends. Shop Now →",
			audience: "all",
			discountCode: "SUMMER20",
			startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			recipientCount: 0,
			sentCount: 0,
			openCount: 0,
			clickCount: 0,
		},
		{
			name: "Referral Program Push",
			description: "Social media campaign promoting our referral program.",
			type: "social",
			status: "scheduled",
			content: "Share the love! Give your friends $10 off their first order and earn $10 credit for every referral. Link in bio.",
			audience: "all",
			scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
			recipientCount: 0,
			sentCount: 0,
		},
		{
			name: "Win-back Campaign",
			description: "Re-engage customers who haven't ordered in 60+ days.",
			type: "email",
			status: "draft",
			subject: "We miss you! Here's 15% off",
			content: "It's been a while since your last order. Come back and enjoy 15% off with code MISSYOU15.",
			audience: "segment",
			discountCode: "MISSYOU15",
			recipientCount: 0,
			sentCount: 0,
		},
		{
			name: "Holiday Gift Guide",
			description: "Email campaign with curated gift bundles for the holidays.",
			type: "email",
			status: "draft",
			subject: "The perfect coffee gift — Holiday Guide inside",
			audience: "all",
			recipientCount: 0,
			sentCount: 0,
		},
	])

	// --- REFERRAL CODES ---
	console.log("Creating referral data...")
	const referralCodeValues = customers.slice(0, 6).map((customer, i) => ({
		userId: customer.id,
		code: ["FRIEND-" + customer.name?.split(" ")[0]?.toUpperCase(), "SHARE-" + String(1000 + i), "REF-COFFEE" + i, "BEANS-" + String(i + 1).padStart(3, "0"), "INVITE-JB" + i, "BREW-" + customer.name?.split(" ")[0]?.toUpperCase()][i] || `REF-${i}`,
		totalReferrals: [4, 7, 2, 1, 3, 0][i],
		totalEarnings: ["40.00", "70.00", "20.00", "10.00", "30.00", "0.00"][i],
	}))
	await db.insert(schema.referralCodes).values(referralCodeValues)

	// Create referral records
	const referralStatuses = ["pending", "completed", "rewarded", "rewarded", "completed"]
	const referralValues = []
	for (let i = 0; i < 12; i++) {
		const referrer = customers[i % 6]
		const referred = customers[(i + 6) % customers.length]
		if (referrer.id === referred.id) continue
		const status = referralStatuses[i % referralStatuses.length]
		referralValues.push({
			referrerId: referrer.id,
			referredId: referred.id,
			referralCode: referralCodeValues[i % 6].code,
			status,
			rewardAmount: status === "rewarded" ? "10.00" : null,
			rewardType: status === "rewarded" ? "credit" : null,
			completedAt: status !== "pending" ? new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000) : null,
			createdAt: new Date(Date.now() - (30 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000),
		})
	}
	await db.insert(schema.referrals).values(referralValues)

	// --- SUPPLIERS ---
	console.log("Creating suppliers...")
	const insertedSuppliers = await db
		.insert(schema.suppliers)
		.values([
			{
				name: "Green Mountain Roasters",
				contactEmail: "orders@greenmountain.example.com",
				contactPhone: "+1 802-555-0100",
				website: "https://greenmountain.example.com",
				country: "US",
				averageLeadTimeDays: "5",
				shippingMethods: ["Ground", "Express"],
				notes: "Primary supplier for single-origin beans. Reliable quality and fast turnaround.",
			},
			{
				name: "Colombian Direct Trade Co.",
				contactEmail: "export@colombiandirect.example.com",
				contactPhone: "+57 1-555-0200",
				website: "https://colombiandirect.example.com",
				country: "CO",
				averageLeadTimeDays: "14",
				shippingMethods: ["Sea Freight", "Air Freight"],
				notes: "Direct trade partner for Colombian Supremo and other South American origins.",
			},
			{
				name: "East African Beans Ltd",
				contactEmail: "sales@eastafricanbeans.example.com",
				country: "KE",
				averageLeadTimeDays: "21",
				shippingMethods: ["Sea Freight"],
				notes: "Ethiopian and Kenyan specialty coffees.",
			},
			{
				name: "Pacific Brew Supplies",
				contactEmail: "hello@pacificbrew.example.com",
				contactPhone: "+1 503-555-0300",
				country: "US",
				averageLeadTimeDays: "3",
				shippingMethods: ["Ground", "Next Day"],
				notes: "Accessories and brewing equipment supplier.",
			},
			{
				name: "Sumatra Farms Cooperative",
				contactEmail: "coop@sumatrafarms.example.com",
				country: "ID",
				averageLeadTimeDays: "28",
				shippingMethods: ["Sea Freight"],
			},
		])
		.returning()

	// --- PURCHASE ORDERS ---
	console.log("Creating purchase orders...")
	const poStatuses = ["draft", "submitted", "confirmed", "shipped", "received", "received", "cancelled"]
	const poValues = []
	for (let i = 0; i < 12; i++) {
		const supplier = insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)]
		const status = poStatuses[Math.floor(Math.random() * poStatuses.length)]
		const subtotal = (100 + Math.random() * 2000).toFixed(2)
		const shipping = (10 + Math.random() * 50).toFixed(2)
		const total = (parseFloat(subtotal) + parseFloat(shipping)).toFixed(2)
		const daysAgo = Math.floor(Math.random() * 90)
		const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

		poValues.push({
			poNumber: `PO-${String(2000 + i).padStart(5, "0")}`,
			supplierId: supplier.id,
			status,
			subtotal,
			shippingCost: shipping,
			total,
			expectedDelivery: new Date(createdAt.getTime() + (parseInt(supplier.averageLeadTimeDays || "7") + 5) * 24 * 60 * 60 * 1000),
			receivedAt: status === "received" ? new Date(createdAt.getTime() + parseInt(supplier.averageLeadTimeDays || "7") * 24 * 60 * 60 * 1000) : null,
			notes: Math.random() > 0.7 ? "Restock order for low inventory items" : null,
			createdAt,
		})
	}

	const insertedPOs = await db.insert(schema.purchaseOrders).values(poValues).returning()

	// PO items
	const poItemValues = []
	for (const po of insertedPOs) {
		const itemCount = 1 + Math.floor(Math.random() * 4)
		for (let j = 0; j < itemCount; j++) {
			const variant = coffeeVariants[Math.floor(Math.random() * coffeeVariants.length)]
			const qty = 10 + Math.floor(Math.random() * 90)
			const unitCost = (5 + Math.random() * 15).toFixed(2)
			const received = po.status === "received" ? qty : po.status === "shipped" ? Math.floor(qty * Math.random()) : 0
			poItemValues.push({
				purchaseOrderId: po.id,
				variantId: variant.id,
				quantity: qty,
				unitCost,
				totalCost: (qty * parseFloat(unitCost)).toFixed(2),
				receivedQuantity: received,
			})
		}
	}
	await db.insert(schema.purchaseOrderItems).values(poItemValues)

	// --- SHIPPING ---
	console.log("Creating shipping carriers...")
	const [carrierUPS, carrierFedEx, carrierUSPS] = await db
		.insert(schema.shippingCarriers)
		.values([
			{ name: "UPS", code: "ups", trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking_number}" },
			{ name: "FedEx", code: "fedex", trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={tracking_number}" },
			{ name: "USPS", code: "usps", trackingUrlTemplate: "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}" },
		])
		.returning()

	console.log("Creating shipping rates...")
	const shippingRateValues = [
		{ carrierId: carrierUPS.id, name: "UPS Ground", flatRate: "8.99", estimatedDays: "5-7" },
		{ carrierId: carrierUPS.id, name: "UPS 2nd Day Air", flatRate: "15.99", estimatedDays: "2" },
		{ carrierId: carrierUPS.id, name: "UPS Next Day Air", flatRate: "29.99", estimatedDays: "1" },
		{ carrierId: carrierFedEx.id, name: "FedEx Ground", flatRate: "7.99", estimatedDays: "5-7" },
		{ carrierId: carrierFedEx.id, name: "FedEx Express", flatRate: "18.99", estimatedDays: "2" },
		{ carrierId: carrierFedEx.id, name: "FedEx Priority", flatRate: "34.99", estimatedDays: "1" },
		{ carrierId: carrierUSPS.id, name: "USPS Priority Mail", flatRate: "6.99", estimatedDays: "3-5" },
		{ carrierId: carrierUSPS.id, name: "USPS Express", flatRate: "24.99", estimatedDays: "1-2" },
	]
	const shippingRates = await db.insert(schema.shippingRates).values(shippingRateValues).returning()

	console.log("Creating shipping zones...")
	const [zoneDomestic, zoneCanada, zoneIntl] = await db
		.insert(schema.shippingZones)
		.values([
			{ name: "Domestic (US)", countries: ["US"], regions: [] },
			{ name: "Canada", countries: ["CA"], regions: [] },
			{ name: "International", countries: ["GB", "AU", "DE", "FR", "JP"], regions: [] },
		])
		.returning()

	// Assign some rates to zones
	await db.insert(schema.shippingZoneRates).values([
		{ zoneId: zoneDomestic.id, carrierId: carrierUPS.id, rateId: shippingRates[0].id },
		{ zoneId: zoneDomestic.id, carrierId: carrierUPS.id, rateId: shippingRates[1].id },
		{ zoneId: zoneDomestic.id, carrierId: carrierFedEx.id, rateId: shippingRates[3].id },
		{ zoneId: zoneDomestic.id, carrierId: carrierUSPS.id, rateId: shippingRates[6].id },
		{ zoneId: zoneCanada.id, carrierId: carrierUPS.id, rateId: shippingRates[0].id, priceOverride: "14.99" },
		{ zoneId: zoneCanada.id, carrierId: carrierFedEx.id, rateId: shippingRates[4].id, priceOverride: "24.99" },
		{ zoneId: zoneIntl.id, carrierId: carrierFedEx.id, rateId: shippingRates[4].id, priceOverride: "39.99" },
		{ zoneId: zoneIntl.id, carrierId: carrierUPS.id, rateId: shippingRates[2].id, priceOverride: "49.99" },
	])

	// Labels and tracking for shipped/delivered orders
	console.log("Creating shipping labels and tracking...")
	const shippedOrders = insertedOrders.filter(o => o.status === "shipped" || o.status === "delivered")
	const carriers = [carrierUPS, carrierFedEx, carrierUSPS]
	const labelStatuses = ["printed", "shipped", "delivered"]
	const trackingStatuses = ["in_transit", "out_for_delivery", "delivered"]

	for (const order of shippedOrders) {
		const carrier = carriers[Math.floor(Math.random() * carriers.length)]
		const trackingNum = `${carrier.code.toUpperCase()}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
		const labelStatus = order.status === "delivered" ? "delivered" : labelStatuses[Math.floor(Math.random() * 2)]
		const trackStatus = order.status === "delivered" ? "delivered" : trackingStatuses[Math.floor(Math.random() * 2)]

		await db.insert(schema.shippingLabels).values({
			orderId: order.id,
			carrierId: carrier.id,
			trackingNumber: trackingNum,
			status: labelStatus,
			weight: (0.5 + Math.random() * 3).toFixed(2),
			dimensions: { length: 20 + Math.floor(Math.random() * 20), width: 15 + Math.floor(Math.random() * 10), height: 5 + Math.floor(Math.random() * 15) },
			cost: (5 + Math.random() * 25).toFixed(2),
		})

		await db.insert(schema.shipmentTracking).values({
			orderId: order.id,
			carrierId: carrier.id,
			trackingNumber: trackingNum,
			status: trackStatus,
			estimatedDelivery: new Date(Date.now() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
			statusHistory: [
				{ status: "pending", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), location: "Origin facility" },
				{ status: "in_transit", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), location: "Distribution center" },
				...(trackStatus === "delivered" ? [{ status: "delivered", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), location: "Customer address" }] : []),
			],
		})
	}

	// --- BLOG POSTS ---
	console.log("Creating blog posts...")
	await db.insert(schema.blogPosts).values([
		{
			title: "The Ultimate Guide to Pour-Over Coffee",
			slug: "ultimate-guide-pour-over-coffee",
			excerpt: "Master the art of pour-over brewing with our step-by-step guide covering grind size, water temperature, and pouring technique.",
			content: "<h2>Why Pour-Over?</h2><p>Pour-over coffee gives you complete control over the brewing process, resulting in a clean, nuanced cup that highlights the unique characteristics of each bean.</p><h3>What You'll Need</h3><ul><li>Pour-over dripper (V60, Kalita Wave, or Chemex)</li><li>Paper filters</li><li>Gooseneck kettle</li><li>Fresh coffee beans</li><li>Scale and timer</li></ul><h3>The Method</h3><p>Start with a 1:16 coffee-to-water ratio. Heat your water to 200-205°F. Bloom the grounds with twice their weight in water for 30-45 seconds, then pour in slow, concentric circles.</p><p>Total brew time should be 3-4 minutes for a V60, or 4-5 minutes for a Chemex.</p>",
			coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
			status: "published",
			publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
			metaTitle: "The Ultimate Guide to Pour-Over Coffee | Quickdash",
			metaDescription: "Learn how to brew the perfect pour-over coffee with our comprehensive guide covering equipment, technique, and tips.",
			tags: ["brewing", "pour-over", "guide"],
		},
		{
			title: "Understanding Coffee Roast Levels",
			slug: "understanding-coffee-roast-levels",
			excerpt: "From light to dark, each roast level brings out different flavors. Here's what you need to know.",
			content: "<h2>Light Roast</h2><p>Light roasts preserve the original characteristics of the bean. Expect bright acidity, fruity notes, and a lighter body. These are often single-origin coffees.</p><h2>Medium Roast</h2><p>The sweet spot for many drinkers. Medium roasts balance origin flavors with roast development, offering caramel sweetness and a rounded body.</p><h2>Dark Roast</h2><p>Dark roasts emphasize the roasting process itself. Bold, smoky, and full-bodied with notes of chocolate and nuts. Lower acidity makes them smooth and approachable.</p>",
			coverImage: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800",
			status: "published",
			publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			tags: ["education", "roasting"],
		},
		{
			title: "Cold Brew vs Iced Coffee: What's the Difference?",
			slug: "cold-brew-vs-iced-coffee",
			excerpt: "They look similar in the glass, but cold brew and iced coffee are made completely differently. Here's why it matters.",
			content: "<p>Draft content in progress...</p>",
			status: "draft",
			tags: ["brewing", "cold-brew"],
		},
		{
			title: "Our Journey to Direct Trade",
			slug: "journey-to-direct-trade",
			excerpt: "How we built relationships with farmers in Colombia and Mexico to bring you ethically sourced, exceptional coffee.",
			content: "<h2>Why Direct Trade Matters</h2><p>When we started Quickdash, we knew we wanted to do things differently. Direct trade means working face-to-face with farmers, paying fair prices, and ensuring sustainable practices from seed to cup.</p><p>This post has been archived as we update our sourcing story.</p>",
			coverImage: "https://images.unsplash.com/photo-1524350876685-274059332603?w=800",
			status: "archived",
			publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
			tags: ["sourcing", "sustainability"],
		},
	])

	// --- SITE PAGES ---
	console.log("Creating site pages...")
	await db.insert(schema.sitePages).values([
		{
			title: "About Us",
			slug: "about",
			content: "<h2>Our Story</h2><p>Quickdash started as a simple idea: make exceptional coffee accessible to everyone. Founded by a team of four coffee enthusiasts in Canada, we've grown from a small online shop to a community of passionate coffee lovers.</p><h3>Our Mission</h3><p>We source the finest beans from around the world, working directly with farmers to ensure quality and sustainability. Every bag we sell represents a relationship built on mutual respect and fair trade.</p><h3>The Team</h3><p>Ash, Reese, Lorena, and Ashley — four people united by a love of great coffee and a vision for building something meaningful.</p>",
			status: "published",
			metaTitle: "About Us | Quickdash",
			metaDescription: "Learn about the Quickdash story, our mission, and the team behind your favorite coffee.",
		},
		{
			title: "FAQ",
			slug: "faq",
			content: "<h2>Frequently Asked Questions</h2><h3>How long does shipping take?</h3><p>Domestic orders typically arrive within 3-5 business days. International orders may take 7-14 business days depending on your location.</p><h3>Do you offer subscriptions?</h3><p>Yes! We offer weekly, biweekly, and monthly delivery subscriptions. You can pause, skip, or cancel anytime.</p><h3>What's your return policy?</h3><p>We accept returns within 30 days of purchase for unopened products. If there's an issue with your order, reach out to us and we'll make it right.</p><h3>Do you accept cryptocurrency?</h3><p>Yes, we accept payments via WalletConnect on Ethereum, Polygon, Base, and Arbitrum.</p>",
			status: "published",
			metaTitle: "FAQ | Quickdash",
		},
		{
			title: "Contact",
			slug: "contact",
			content: "<h2>Get in Touch</h2><p>Have a question or just want to say hi? We'd love to hear from you.</p><p><strong>Email:</strong> hello@quickdash.net</p><p><strong>Hours:</strong> Monday - Friday, 9am - 5pm EST</p><p>We typically respond within 24 hours.</p>",
			status: "published",
		},
	])

	// --- SITE CONTENT ---
	console.log("Creating site content...")
	await db.insert(schema.siteContent).values([
		{ key: "hero_headline", type: "text", value: "Coffee, Elevated." },
		{ key: "hero_subtext", type: "text", value: "Premium single-origin beans, roasted to perfection and delivered to your door." },
		{ key: "hero_image", type: "image", value: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200" },
		{ key: "banner_text", type: "text", value: "Free shipping on orders over $50" },
		{ key: "banner_link", type: "text", value: "/products" },
		{ key: "about_body", type: "richtext", value: "<p>We're a small team with a big passion for coffee. Every bean tells a story, and we're here to share it with you.</p>" },
		{ key: "footer_tagline", type: "text", value: "Fuel your day with Quickdash" },
		{ key: "footer_copyright", type: "text", value: "© 2025 Quickdash. All rights reserved." },
		{ key: "announcement_text", type: "text", value: "" },
		{ key: "newsletter_heading", type: "text", value: "Stay in the Loop" },
		{ key: "newsletter_subtext", type: "text", value: "Subscribe for exclusive deals, brewing tips, and new product launches." },
	])

	// --- MEDIA ITEMS ---
	console.log("Creating media items...")
	await db.insert(schema.mediaItems).values([
		{ url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800", filename: "hero-coffee.jpg", mimeType: "image/jpeg", size: 245000, alt: "Cup of coffee on table" },
		{ url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800", filename: "pour-over.jpg", mimeType: "image/jpeg", size: 198000, alt: "Pour-over coffee brewing" },
		{ url: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800", filename: "roasted-beans.jpg", mimeType: "image/jpeg", size: 312000, alt: "Freshly roasted coffee beans" },
		{ url: "https://images.unsplash.com/photo-1524350876685-274059332603?w=800", filename: "coffee-farm.jpg", mimeType: "image/jpeg", size: 287000, alt: "Coffee farm in Colombia" },
		{ url: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800", filename: "espresso-shot.jpg", mimeType: "image/jpeg", size: 156000, alt: "Espresso being pulled" },
		{ url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=800", filename: "latte-art.jpg", mimeType: "image/jpeg", size: 203000, alt: "Latte art" },
		{ url: "https://images.unsplash.com/photo-1504627298434-2119d32b7e97?w=800", filename: "coffee-bags.jpg", mimeType: "image/jpeg", size: 178000, alt: "Coffee bags on shelf" },
		{ url: "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800", filename: "brewing-gear.jpg", mimeType: "image/jpeg", size: 221000, alt: "Coffee brewing equipment" },
		{ url: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800", filename: "cafe-interior.jpg", mimeType: "image/jpeg", size: 265000, alt: "Cafe interior shot" },
		{ url: "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800", filename: "cold-brew.jpg", mimeType: "image/jpeg", size: 189000, alt: "Cold brew coffee" },
		{ url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800", filename: "matcha-latte.jpg", mimeType: "image/jpeg", size: 175000, alt: "Matcha latte" },
		{ url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800", filename: "french-press.jpg", mimeType: "image/jpeg", size: 195000, alt: "French press coffee" },
		{ url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800", filename: "coffee-cup-close.jpg", mimeType: "image/jpeg", size: 142000, alt: "Close-up coffee cup" },
		{ url: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800", filename: "kettle-pour.jpg", mimeType: "image/jpeg", size: 167000, alt: "Gooseneck kettle pouring" },
		{ url: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=800", filename: "grinder.jpg", mimeType: "image/jpeg", size: 213000, alt: "Coffee grinder" },
	])

	// --- EMAIL TEMPLATES ---
	console.log("Creating email templates...")
	await db.insert(schema.emailTemplates).values([
		{
			name: "Order Confirmation",
			slug: "order_confirmation",
			subject: "Your Quickdash order #{{order_number}} is confirmed!",
			body: "<h2>Thank you for your order!</h2><p>Hi {{customer_name}},</p><p>We've received your order and are getting it ready. Here's a summary:</p><p><strong>Order #{{order_number}}</strong></p><p>Total: {{order_total}}</p><p>We'll send you a shipping notification once your order is on its way.</p><p>Cheers,<br/>The Quickdash Team</p>",
			variables: ["customer_name", "order_number", "order_total", "order_items"],
			isActive: true,
		},
		{
			name: "Shipping Update",
			slug: "shipping_update",
			subject: "Your Quickdash order is on its way!",
			body: "<h2>Your order has shipped!</h2><p>Hi {{customer_name}},</p><p>Great news — your order #{{order_number}} is on its way to you.</p><p><strong>Tracking Number:</strong> {{tracking_number}}</p><p><a href='{{tracking_url}}'>Track your package</a></p><p>Estimated delivery: {{estimated_delivery}}</p>",
			variables: ["customer_name", "order_number", "tracking_number", "tracking_url", "estimated_delivery"],
			isActive: true,
		},
		{
			name: "Subscription Created",
			slug: "subscription_created",
			subject: "Your Quickdash subscription is active!",
			body: "<h2>Welcome to your coffee subscription!</h2><p>Hi {{customer_name}},</p><p>Your {{frequency}} subscription is now active. Your first delivery is scheduled for {{next_delivery_date}}.</p><p>You can manage your subscription anytime from your account.</p>",
			variables: ["customer_name", "frequency", "next_delivery_date"],
			isActive: true,
		},
		{
			name: "Payment Failed",
			slug: "payment_failed",
			subject: "Action needed: Payment failed for your Quickdash order",
			body: "<h2>Payment Issue</h2><p>Hi {{customer_name}},</p><p>We weren't able to process your payment for order #{{order_number}}. Please update your payment method to avoid any interruption.</p><p><a href='{{update_payment_url}}'>Update Payment Method</a></p>",
			variables: ["customer_name", "order_number", "update_payment_url"],
			isActive: true,
		},
		{
			name: "Welcome",
			slug: "welcome",
			subject: "Welcome to Quickdash!",
			body: "<h2>Welcome aboard!</h2><p>Hi {{customer_name}},</p><p>Thanks for creating your Quickdash account. You're now part of our community of coffee lovers.</p><p>Here's what you can do:</p><ul><li>Browse our curated selection of premium coffees</li><li>Set up a subscription for regular deliveries</li><li>Earn loyalty points with every purchase</li></ul><p>Happy brewing!</p>",
			variables: ["customer_name"],
			isActive: true,
		},
		{
			name: "Password Reset",
			slug: "password_reset",
			subject: "Reset your Quickdash password",
			body: "<h2>Password Reset</h2><p>Hi {{customer_name}},</p><p>We received a request to reset your password. Click the link below to set a new one:</p><p><a href='{{reset_url}}'>Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>",
			variables: ["customer_name", "reset_url"],
			isActive: true,
		},
		{
			name: "Email Verification",
			slug: "email_verification",
			subject: "Verify your Quickdash email",
			body: "<h2>Verify Your Email</h2><p>Hi {{customer_name}},</p><p>Please confirm your email address by clicking the link below:</p><p><a href='{{verification_url}}'>Verify Email</a></p><p>This link expires in 24 hours.</p>",
			variables: ["customer_name", "verification_url"],
			isActive: true,
		},
		{
			name: "Team Invite",
			slug: "team-invite",
			subject: "You've been invited to Quickdash Admin",
			body: "<h2>You're invited!</h2><p>{{inviter_name}} has invited you to join the Quickdash admin panel as <strong>{{role}}</strong>.</p><p>Sign in with your Google account ({{invitee_email}}) to get started:</p><p><a href='{{login_url}}'>Sign In to Quickdash Admin</a></p><p>This invite will expire in 7 days.</p>",
			variables: ["inviter_name", "invitee_email", "role", "login_url"],
			isActive: true,
		},
	])

	// --- ANALYTICS EVENTS (for heatmap and traffic) ---
	console.log("Creating analytics events...")
	const analyticsValues = []
	const pathnames = ["/", "/products", "/products/midnight-espresso", "/products/morning-ritual-blend", "/products/ethiopian-yirgacheffe", "/cart", "/checkout", "/about", "/faq", "/blog"]
	const referrers = ["", "", "", "google.com", "instagram.com", "facebook.com", "twitter.com", "tiktok.com", "reddit.com", "bing.com"]

	// Generate events for the past 364 days
	for (let daysAgo = 0; daysAgo < 364; daysAgo++) {
		const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
		// Vary visitor count by day of week (weekends higher) and add some randomness
		const dayOfWeek = date.getDay()
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
		const baseVisitors = isWeekend ? 80 : 50
		// Add seasonal variation (more visitors in winter months)
		const month = date.getMonth()
		const seasonalBoost = [1.3, 1.2, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.4][month]
		// Add some random days with spikes (promotions/campaigns)
		const spike = Math.random() > 0.95 ? 2.5 : 1
		const visitorCount = Math.floor(baseVisitors * seasonalBoost * spike * (0.7 + Math.random() * 0.6))

		for (let v = 0; v < visitorCount; v++) {
			const visitorId = `v_${daysAgo}_${v}`
			const sessionId = `s_${daysAgo}_${v}`
			// Each visitor views 1-5 pages
			const pageViews = 1 + Math.floor(Math.random() * 4)
			for (let p = 0; p < pageViews; p++) {
				analyticsValues.push({
					sessionId,
					visitorId,
					eventType: "pageview",
					pathname: pathnames[Math.floor(Math.random() * pathnames.length)],
					referrer: p === 0 ? referrers[Math.floor(Math.random() * referrers.length)] : "",
					hostname: "quickdash.net",
					createdAt: new Date(date.getTime() + Math.floor(Math.random() * 24 * 60 * 60 * 1000)),
				})
			}
		}
	}

	// Insert in batches to avoid memory issues
	const batchSize = 1000
	for (let i = 0; i < analyticsValues.length; i += batchSize) {
		const batch = analyticsValues.slice(i, i + batchSize)
		await db.insert(schema.analyticsEvents).values(batch)
	}
	console.log(`Created ${analyticsValues.length} analytics events`)

	// --- ALERT RULES ---
	console.log("Creating alert rules...")
	await db.insert(schema.alertRules).values([
		{ name: "Low Stock Warning", type: "low_stock", channel: "email", threshold: 10, isActive: true },
		{ name: "New Order Notification", type: "new_order", channel: "in_app", isActive: true },
		{ name: "Failed Payment Alert", type: "failed_payment", channel: "email", isActive: true },
		{ name: "Review Reported", type: "review_reported", channel: "in_app", isActive: true },
		{ name: "Subscription Cancelled", type: "subscription_cancelled", channel: "email", isActive: false },
	])

	// --- STORE SETTINGS ---
	console.log("Creating store settings...")
	await db.insert(schema.storeSettings).values([
		{ key: "store_name", value: "Quickdash", group: "general" },
		{ key: "store_tagline", value: "Premium coffee, delivered.", group: "general" },
		{ key: "contact_email", value: "hello@quickdash.net", group: "general" },
		{ key: "contact_phone", value: "+1 416-555-BEAN", group: "general" },
		{ key: "address_street", value: "123 Queen St W", group: "general" },
		{ key: "address_city", value: "Toronto", group: "general" },
		{ key: "address_province", value: "Ontario", group: "general" },
		{ key: "address_country", value: "Canada", group: "general" },
		{ key: "address_postal", value: "M5H 2M9", group: "general" },
		{ key: "currency", value: "CAD", group: "general" },
		{ key: "timezone", value: "America/Toronto", group: "general" },
		{ key: "tax_enabled", value: "true", group: "tax" },
		{ key: "prices_include_tax", value: "false", group: "tax" },
		{ key: "tax_auto_calculate", value: "true", group: "tax" },
		{ key: "tax_rates", value: JSON.stringify([
			{ id: "1", region: "Ontario", rate: 13, name: "HST" },
			{ id: "2", region: "British Columbia", rate: 12, name: "GST+PST" },
			{ id: "3", region: "Alberta", rate: 5, name: "GST" },
			{ id: "4", region: "Quebec", rate: 14.975, name: "GST+QST" },
		]), group: "tax" },
		{ key: "polar_test_mode", value: "true", group: "payments" },
	])

	console.log("Seed complete!")
	await client.end()
}

seed().catch((err) => {
	console.error("Seed failed:", err)
	process.exit(1)
})
