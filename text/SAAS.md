# Quickdash SaaS Platform

## Vision

Monetize Quickdash as a subscription SaaS platform. Other entrepreneurs pay to rent the infrastructure and start their own ecommerce brands using our system.

**Two Business Models:**
1. **Quickdash Brand** - Our own store (skate gear, coffee, matcha, tea, apparel)
2. **Quickdash Platform** - Others pay to run their stores on our infrastructure

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      quickdash SAAS PLATFORM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     SUPER ADMIN                              │    │
│  │  (Quickdash team - manages all tenants)                       │    │
│  │                                                              │    │
│  │  • Tenant management                                         │    │
│  │  • Platform billing                                          │    │
│  │  • Usage monitoring                                          │    │
│  │  • System health                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│  │  TENANT A   │      │  TENANT B   │      │  TENANT C   │         │
│  │  (Quickdash) │      │  (Coffee Co)│      │  (Skate Shop│         │
│  │             │      │             │      │             │         │
│  │  • Products │      │  • Products │      │  • Products │         │
│  │  • Orders   │      │  • Orders   │      │  • Orders   │         │
│  │  • Customers│      │  • Customers│      │  • Customers│         │
│  │  • Settings │      │  • Settings │      │  • Settings │         │
│  │  • Branding │      │  • Branding │      │  • Branding │         │
│  └─────────────┘      └─────────────┘      └─────────────┘         │
│         │                    │                    │                 │
│         ▼                    ▼                    ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   SHARED INFRASTRUCTURE                      │    │
│  │                                                              │    │
│  │  • Database (multi-tenant with row-level security)          │    │
│  │  • Webhooks & Automation                                     │    │
│  │  • Payment Processing (Polar/Stripe)                         │    │
│  │  • Email (Resend)                                            │    │
│  │  • Real-time (Pusher)                                        │    │
│  │  • File Storage                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Approach

### Option A: Shared Database with Row-Level Security
- Single database, `tenant_id` on every table
- PostgreSQL RLS policies enforce isolation
- Cheaper, easier to manage
- Good for: Small-medium tenants

### Option B: Database Per Tenant
- Separate database for each tenant
- Complete data isolation
- More expensive, more complex
- Good for: Enterprise tenants

### Recommended: Hybrid
- Start with Option A (shared)
- Offer Option B as premium tier for enterprise customers

---

## Pricing Tiers

| Tier | Price | Included |
|------|-------|----------|
| **Starter** | $29/mo | 100 orders/mo, 1 user, basic support |
| **Growth** | $79/mo | 1,000 orders/mo, 5 users, priority support |
| **Pro** | $199/mo | 10,000 orders/mo, unlimited users, API access |
| **Enterprise** | Custom | Dedicated database, SLA, custom integrations |

### Add-ons
- Extra orders: $0.10/order over limit
- Additional storage: $5/10GB
- Custom domain: $10/mo
- White-label (remove Quickdash branding): $50/mo

---

## Features Per Tier

| Feature | Starter | Growth | Pro | Enterprise |
|---------|---------|--------|-----|------------|
| Products | 100 | 1,000 | Unlimited | Unlimited |
| Orders/month | 100 | 1,000 | 10,000 | Unlimited |
| Team members | 1 | 5 | Unlimited | Unlimited |
| Custom domain | ❌ | ✅ | ✅ | ✅ |
| White-label | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ✅ | ✅ |
| Automation builder | ❌ | Basic | Full | Full |
| Dedicated support | ❌ | ❌ | ❌ | ✅ |
| SLA | ❌ | ❌ | ❌ | ✅ |

---

## Implementation Tasks

### Phase 1: Multi-Tenant Foundation
- [ ] Add `tenantId` to all relevant tables
- [ ] Create tenants table
- [ ] Implement row-level security policies
- [ ] Update all queries to filter by tenant
- [ ] Tenant context in auth session

### Phase 2: Tenant Onboarding
- [ ] Landing page / marketing site
- [ ] Sign-up flow
- [ ] Stripe/Polar subscription checkout
- [ ] Tenant provisioning (create tenant, seed data)
- [ ] Onboarding wizard (store name, logo, settings)

### Phase 3: Super Admin Dashboard
- [ ] `/super-admin` route (Quickdash team only)
- [ ] List all tenants
- [ ] Tenant health metrics
- [ ] Impersonate tenant (for support)
- [ ] Billing management

### Phase 4: Tenant Customization
- [ ] Custom branding (logo, colors, fonts)
- [ ] Custom domain mapping
- [ ] Email templates per tenant
- [ ] Storefront themes

### Phase 5: Billing & Limits
- [ ] Usage tracking (orders, storage, users)
- [ ] Enforce tier limits
- [ ] Overage billing
- [ ] Upgrade/downgrade flows

### Phase 6: API & Integrations
- [ ] Tenant API keys
- [ ] REST API with rate limiting
- [ ] Webhook management per tenant
- [ ] Third-party integrations

---

## Database Changes

### New Tables

```sql
-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  plan TEXT DEFAULT 'starter',
  status TEXT DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  custom_domain TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant usage tracking
CREATE TABLE tenant_usage (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  period TEXT NOT NULL, -- '2024-01'
  orders_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Existing Tables - Add tenant_id

```sql
ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE orders ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
-- ... all other tables
```

### Row-Level Security

```sql
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## Tech Stack Additions

| Component | Purpose |
|-----------|---------|
| Stripe | Platform subscription billing |
| Vercel (or similar) | Custom domain routing |
| PostHog | Usage analytics per tenant |
| Crisp/Intercom | Support chat |

---

## Revenue Projections

| Tenants | Avg Revenue | MRR |
|---------|-------------|-----|
| 10 | $79 | $790 |
| 50 | $99 | $4,950 |
| 100 | $119 | $11,900 |
| 500 | $129 | $64,500 |

---

## Competitive Landscape

| Platform | Pricing | Notes |
|----------|---------|-------|
| Shopify | $29-299/mo | Giant, expensive at scale |
| WooCommerce | Free + hosting | Self-hosted headache |
| BigCommerce | $29-299/mo | Enterprise focused |
| **Quickdash** | $29-199/mo | Modern stack, automation-first |

### Our Differentiators
- Built-in automation pipeline
- Dropshipping-friendly (Dripshipper support)
- Modern tech stack (Next.js, real-time)
- Node-based workflow builder
- Transparent pricing

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data isolation breach | RLS + audit logging + testing |
| Noisy neighbor (one tenant affects others) | Resource limits, monitoring |
| Tenant churn | Great onboarding, support, features |
| Support scaling | Docs, community, tiered support |

---

## Timeline

**Phase 1-2 (Foundation + Onboarding):** 4-6 weeks
**Phase 3-4 (Super Admin + Customization):** 4-6 weeks
**Phase 5-6 (Billing + API):** 4-6 weeks

**Total:** ~3-4 months to MVP SaaS

---

## Notes

*This is the long-term vision. First priority is getting Quickdash (our own brand) working perfectly with the automation pipeline. SaaS expansion comes after.*
