# @quickdash/sdk

Official TypeScript SDK for the Quickdash Storefront API.

## Installation

```bash
npm install @quickdash/sdk
# or
pnpm add @quickdash/sdk
# or
yarn add @quickdash/sdk
# or
bun add @quickdash/sdk
```

## Quick Start

```typescript
import { Quickdash } from "@quickdash/sdk"

const client = new Quickdash({
  apiKey: "sf_your_api_key", // Get from Quickdash Admin > Settings > Storefronts
})

// Get site configuration
const { site } = await client.site.get()
console.log(site.name, site.locale.currency)

// List products
const { products, pagination } = await client.products.list({
  limit: 20,
  category: "gemstones",
  sort: "price",
  order: "asc",
})

// Get single product
const { product } = await client.products.get("blue-sapphire")
```

## Authentication

For customer-specific operations (orders, wishlist, reviews), authenticate first:

```typescript
// Login
const { user, token } = await client.auth.login({
  email: "customer@example.com",
  password: "password123",
})

// Token is automatically stored. Now you can access customer endpoints:
const { orders } = await client.orders.list()
const { items } = await client.wishlist.get()

// Or register a new customer
const { user, token } = await client.auth.register({
  email: "new@example.com",
  password: "password123",
  name: "New Customer",
})

// Logout
client.auth.logout()
```

## API Reference

### Products

```typescript
// List products with filters
const { products, pagination } = await client.products.list({
  page: 1,
  limit: 20,
  category: "rings",      // Filter by category slug
  search: "diamond",      // Search in name
  featured: true,         // Only featured products
  subscribable: true,     // Only subscribable products
  sort: "price",          // Sort by: name, price, createdAt
  order: "asc",           // Order: asc, desc
})

// Get single product by slug
const { product } = await client.products.get("blue-sapphire-ring")
```

### Categories

```typescript
const { categories } = await client.categories.list()
```

### Site Settings

```typescript
const { site } = await client.site.get()

// Access settings
site.name           // Store name
site.locale.currency       // CAD, USD, etc
site.locale.currencySymbol // $, €, etc
site.features.wishlist     // Feature flags
site.social.instagram      // Social links
site.legal.privacyUrl      // Legal pages
```

### Orders

```typescript
// List orders (requires auth)
const { orders, pagination } = await client.orders.list({
  page: 1,
  limit: 10,
  status: "shipped",
})

// Get single order
const { order } = await client.orders.get("order-id")
```

### Checkout

```typescript
const { order } = await client.checkout.create({
  customerId: "user-id",
  items: [
    { variantId: "variant-1", quantity: 2 },
    { variantId: "variant-2", quantity: 1 },
  ],
  shippingAddress: {
    firstName: "John",
    lastName: "Doe",
    addressLine1: "123 Main St",
    city: "Toronto",
    state: "ON",
    postalCode: "M5V 1A1",
    country: "CA",
  },
  customerNotes: "Please gift wrap",
})
```

### Discounts

```typescript
const { discount } = await client.discounts.validate({
  code: "SAVE20",
  subtotal: 100.00,
})

if (discount.valid) {
  console.log(`${discount.type}: ${discount.value}`)
}
```

### Shipping

```typescript
const { rates } = await client.shipping.getRates({
  country: "CA",
  state: "ON",
  postalCode: "M5V 1A1",
  weight: 0.5,
  subtotal: 150.00,
})
```

### Reviews

```typescript
// List reviews for a product
const { reviews } = await client.reviews.list("product-id", {
  page: 1,
  limit: 10,
})

// Submit a review (requires auth)
const { review } = await client.reviews.create({
  productId: "product-id",
  rating: 5,
  title: "Amazing quality!",
  content: "The sapphire is absolutely stunning...",
})
```

### Wishlist

```typescript
// Get wishlist (requires auth)
const { items } = await client.wishlist.get()

// Add to wishlist
await client.wishlist.add("product-id")

// Remove from wishlist
await client.wishlist.remove("product-id")
```

### Auctions

```typescript
// List auctions
const { auctions } = await client.auctions.list({
  status: "active",
})

// Get single auction
const { auction } = await client.auctions.get("auction-id")
```

### Payments

```typescript
// Create Stripe checkout session
const { checkoutUrl, sessionId } = await client.payments.createStripeCheckout({
  orderId: "order-id",
  successUrl: "https://mystore.com/success",
  cancelUrl: "https://mystore.com/cart",
})

// Redirect to Stripe
window.location.href = checkoutUrl
```

## Error Handling

```typescript
import { Quickdash, QuickdashError } from "@quickdash/sdk"

try {
  const { product } = await client.products.get("nonexistent")
} catch (error) {
  if (error instanceof QuickdashError) {
    console.error(`Error ${error.status}: ${error.message}`)
    // error.code may contain additional context
  }
}
```

## Configuration

```typescript
const client = new Quickdash({
  apiKey: "sf_...",                              // Required
  baseUrl: "https://app.quickdash.net",          // Optional, defaults shown
  timeout: 30000,                                 // Optional, in ms
})
```

## Next.js Integration

```typescript
// lib/quickdash.ts
import { Quickdash } from "@quickdash/sdk"

export const quickdash = new Quickdash({
  apiKey: process.env.NEXT_PUBLIC_STOREFRONT_API_KEY!,
})
```

```typescript
// app/products/page.tsx
import { quickdash } from "@/lib/quickdash"

export default async function ProductsPage() {
  const { products } = await quickdash.products.list({ limit: 20 })

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

## License

MIT
