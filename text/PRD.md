# Quickdash - Product Requirements Document

## Vision

Quickdash is a **Backend-as-a-Service platform** — Discord meets Shopify. Users get a powerful backend with real-time communication, ecommerce tools, and workflow automation. They connect their own frontends or use ours.

Think: One app, many workspaces. Like Discord servers, but each workspace can run a business.

**Primary Domain**: quickdash.net (Quickdash flagship store)
**Platform Domain**: app.quickdash.net (main dashboard for all users)
**Hosting**: Vercel
**Database**: Neon PostgreSQL (single database, multi-tenant)
**Founder**: Ash

---

## Top Priority: URL State Management (nuqs)

Before building new features, implement nuqs for URL state:

```typescript
// Instead of useState for filters, tabs, pagination
import { useQueryState } from 'nuqs'

const [filter, setFilter] = useQueryState('filter')
const [sort, setSort] = useQueryState('sort')
const [page, setPage] = useQueryState('page', parseAsInteger)
```

**Benefits:**
- Shareable links (send someone your filtered view)
- Browser back/forward works correctly
- Page refresh preserves state
- SSR pre-renders correct state
- Faster perceived performance

**Where to apply:**
- All data tables (products, orders, customers, inventory)
- Analytics filters
- Settings tabs
- Any filterable/sortable view

---

## Core Concept: The Discord/Shopify Hybrid

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         quickdash PLATFORM                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SINGLE APP, SINGLE DATABASE                   │    │
│  │                                                                  │    │
│  │   USER SIGNS UP ──→ Onboarding ──→ Gets OWN WORKSPACE           │    │
│  │         │                                                        │    │
│  │         ▼                                                        │    │
│  │   YOUR WORKSPACE (your business hub):                            │    │
│  │   ├── Channels (text, voice - team communication)                │    │
│  │   ├── Team members (limited by tier, have dashboard access)      │    │
│  │   ├── Storefronts (connected websites, limited by tier)          │    │
│  │   ├── Products, Orders, Customers, Inventory                     │    │
│  │   ├── Automations (node-based workflows)                         │    │
│  │   └── Settings, Branding, Integrations                           │    │
│  │                                                                  │    │
│  │   PLATFORM-WIDE (not workspace-limited):                         │    │
│  │   ├── DMs with ANY user (unlimited)                              │    │
│  │   ├── Friend discovery & requests                                │    │
│  │   ├── Join OTHER workspaces as team member                       │    │
│  │   └── Global presence (who's online)                             │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  DATA ISOLATION:                                                         │
│  Every business row has workspace_id. Queries filter automatically.      │
│  You only see YOUR workspace's data. Other workspaces are invisible.     │
│  But you CAN be a team member in multiple workspaces (switch between).   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Team Members vs Friends

| Concept | Description | Limits |
|---------|-------------|--------|
| **Team Members** | People with access to YOUR workspace dashboard. Can view/edit products, orders, etc based on role. | Limited by tier (Free: 3, Starter: 10, etc) |
| **Friends** | People you can DM, call, discover. No dashboard access unless you add them as team. | Unlimited |

You can be a team member in MULTIPLE workspaces. Example:
- Ash has "Quickdash" workspace
- Reese has "Reese's Store" workspace
- Ash joins Reese's workspace as team member (helps build)
- Reese joins Ash's workspace as team member (helps build)
- They're also friends, can DM anytime

### Why This Model

- **One codebase** — No maintaining separate instances
- **One database** — Efficient, scalable, Neon handles it
- **Cross-communication** — DM anyone, friend anyone
- **Multi-workspace** — Be a team member in many places
- **Logical isolation** — Each workspace's data is separate

---

## Platform Architecture

### User Hierarchy

```
SUPER ADMIN (Ash)
    │
    ├── Platform-wide control
    ├── All workspaces visible
    ├── Revenue dashboard
    ├── User management
    └── Feature flags

WORKSPACE OWNER (Subscriber)
    │
    ├── Creates/owns workspace
    ├── Billing responsibility
    ├── Full workspace control
    └── Can invite anyone

WORKSPACE ADMIN
    │
    ├── Most permissions
    ├── Can't delete workspace
    └── Can't manage billing

WORKSPACE MEMBER
    │
    ├── Day-to-day operations
    ├── Limited settings access
    └── Full communication access
```

### Onboarding Flow

Simple but intentional. User sets up their environment BEFORE accessing dashboard:

```
┌─────────────────────────────────────────────────────────────────┐
│                      ONBOARDING FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SIGN UP                                                      │
│     └─→ Email + Google OAuth                                     │
│                                                                  │
│  2. PROFILE SETUP (required)                                     │
│     ├─→ Display name                                             │
│     ├─→ Avatar upload                                            │
│     └─→ Theme preference (light/dark/system/coffee)              │
│                                                                  │
│  3. WORKSPACE SETUP (required)                                   │
│     ├─→ Workspace name (their business name)                     │
│     ├─→ Workspace type (ecommerce, community, agency, other)     │
│     └─→ Logo upload (optional, can skip)                         │
│                                                                  │
│  4. DONE → Dashboard                                             │
│     └─→ Welcome modal with quick tips                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Keep it minimal. More settings available in dashboard after onboarding.

### Workspace Model

A workspace is your business hub. Every user gets one after onboarding.

```typescript
workspace: {
  id: string
  name: string
  slug: string              // workspace URL slug
  ownerId: string           // billing responsible
  subscriptionTier: string  // free | starter | growth | pro
  subscriptionStatus: string
  visibility: string        // private | public

  // Branding
  logo: string
  banner: string
  primaryColor: string

  // Limits (based on tier)
  maxStorefronts: number
  maxTeamMembers: number    // team members, NOT friends

  // Features (based on tier)
  features: {
    api: boolean
    automation: boolean
    whiteLabel: boolean
    customDomain: boolean
  }
}
```

### Public vs Private Workspaces

Workspace owner chooses visibility:

| Visibility | Description |
|------------|-------------|
| **Private** | Invite-only. Must receive invite link to join as team member. |
| **Public** | Anyone can discover and request to join (or auto-join if open). |

Use cases:
- **Private**: Your business workspace, clients only
- **Public**: Community workspace, open server for your brand

### Storefront Model (Connected Websites)

Users can connect multiple frontend websites to their workspace:

```typescript
storefront: {
  id: string
  workspaceId: string
  name: string
  domain: string           // their-store.com
  apiKey: string           // for frontend auth
  apiSecret: string        // server-side only

  // What this storefront can access
  permissions: {
    products: boolean
    orders: boolean
    customers: boolean
    checkout: boolean
  }
}
```

**How it works:**
1. User creates storefront in dashboard
2. Gets API key + secret
3. Connects their frontend (Next.js, React, whatever)
4. Frontend calls our API for products, checkout, etc.
5. All data flows through our backend

---

## Communication System (Discord-Style)

### Two Levels of Communication

**1. Workspace Channels (Team Communication)**
- Scoped to YOUR workspace
- Only team members can access
- NOT limited by tier (unlimited channels)

```
WORKSPACE: "Quickdash Coffee"
├── # general           (text)
├── # orders            (text, auto-posts new orders)
├── # announcements     (text, admins only post)
├── # support           (text)
└── Voice Lounge        (voice/video)
```

**2. Platform-Wide (Friends & Discovery)**
- DM any user on the platform
- NOT limited by tier
- Works across workspaces

### Friend System

- **Discover users** — Search by name/email
- **Send friend request** — They accept/decline
- **DM friends** — Direct messages, voice/video calls
- **See presence** — Who's online across platform

### Interaction Types

| Type | Description |
|------|-------------|
| **P2P** | Person to Person — DMs, calls with friends |
| **Team** | Within workspace — Channels, collaboration |
| **Cross-workspace** | Be a team member in multiple workspaces |

---

## Subscription Tiers

| Tier | Price | Storefronts | Team Members | Features |
|------|-------|-------------|--------------|----------|
| **Free** | $0 | 1 | 3 | Basic commerce, messaging, channels |
| **Starter** | $29/mo | 2 | 10 | + Analytics, integrations, plugins |
| **Growth** | $79/mo | 5 | 50 | + API access, automation |
| **Pro** | $199/mo | Unlimited | Unlimited | + White-label, priority support |
| **Beta** | $0 | Unlimited | Unlimited | Full Pro access (hand-picked by Ash) |

**What's NOT limited:**
- Friends (DM anyone, discover anyone)
- Channels within workspace (communication)
- Basic features (products, orders, customers)

**What IS limited:**
- Storefronts (connected websites)
- Team members (dashboard access)
- Advanced features (API, automation, white-label)

### Payment Integrations

Users can connect their own payment processors:
- Stripe
- PayPal
- Reown (Web3/crypto)
- More via plugins

### Plugins & Integrations

Extensible via plugins (free and paid):
- Shipping carriers
- Email providers
- Accounting software
- Marketing tools
- Custom integrations

### Feature Gating

Super Admin (Ash) has everything. Lower tiers have sections locked/hidden:

```typescript
// Check feature access
const canUseAutomation = workspace.features.automation
const canUseAPI = workspace.features.api

// In UI
{canUseAutomation && <AutomationSection />}
{!canUseAutomation && <UpgradePrompt feature="automation" />}
```

---

## Backend-as-a-Service (Headless Mode)

### The Problem We Solve

Your friend Reese has a frontend but needs a backend. Options:
1. Build backend from scratch (months of work)
2. Use Shopify (expensive, limited)
3. **Use Quickdash** (full-featured, affordable)

### How It Works

```
┌─────────────────────┐         ┌─────────────────────┐
│   REESE'S FRONTEND  │         │   quickdash BACKEND  │
│   (his-store.com)   │ ──API── │   (app.quickdash.net)│
│                     │         │                     │
│   - Next.js site    │         │   - Products API    │
│   - Custom design   │         │   - Orders API      │
│   - His branding    │         │   - Checkout API    │
│                     │         │   - Customers API   │
│                     │         │   - Dashboard UI    │
└─────────────────────┘         └─────────────────────┘
```

### API Endpoints (Storefront API)

```
GET  /api/storefront/products
GET  /api/storefront/products/:id
POST /api/storefront/cart
POST /api/storefront/checkout
GET  /api/storefront/orders/:id
```

Authentication via API key in header:
```
X-Storefront-Key: sf_live_xxxxx
```

---

## Automation System

### Node-Based Workflow Builder

Visual automation tool (like n8n) integrated into dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTOMATION CANVAS                         │
│                                                              │
│   [Trigger: New Order] ──→ [Send Email] ──→ [Update Sheet]  │
│          │                                                   │
│          └──→ [If: High Value] ──→ [Notify Slack]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Planned Triggers

- Order created/updated/fulfilled
- Customer signed up
- Payment received/failed
- Inventory low
- Subscription renewed/canceled
- Webhook received
- Scheduled (cron)

### Planned Actions

- Send email
- Send SMS
- Post to Slack/Discord
- Update Google Sheets
- Call external API
- Create/update records
- AI processing (GPT)

### Implementation

Ash will build the workflow builder separately following a tutorial, then integrate:
- Strip its auth
- Connect to existing user system
- Place under Automation in sidebar
- May use tRPC

---

## AI-Powered Features (Future)

### Vision

Automated ecommerce pipeline where:
- Customer service has AI assist
- Order processing is automated
- Inventory reordering is smart
- Marketing campaigns auto-generate
- Reports write themselves

### Not Replacing Humans

AI handles the backend busywork. Humans still:
- Make strategic decisions
- Handle complex support
- Build relationships
- Create content

---

## Native Applications

The dashboard is the product. Native apps are the same dashboard on different platforms.

### Desktop App (Tauri)

Same dashboard, native wrapper:
- Lighter than Electron
- Native performance
- System tray (presence, notifications)
- Native keyboard shortcuts
- Offline indicator
- Auto-updates

### Mobile App (React Native)

Same dashboard, mobile-optimized:
- iOS and Android
- Push notifications
- Quick actions (approve orders, reply to messages)
- Camera for product photos
- Barcode scanning
- Touch-optimized UI

### How It Works

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   WEB APP   │  │ DESKTOP APP │  │ MOBILE APP  │
│  (Browser)  │  │  (Tauri)    │  │(React Native│
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  SAME BACKEND   │
              │  (Next.js API)  │
              └─────────────────┘
```

All platforms, one backend, one database. Your data syncs everywhere.

---

## Technical Enhancements

### URL State Management (nuqs)

Store UI state in URL for:
- Shareable filtered views
- Browser back/forward works
- No loading spinners on refresh
- SSR pre-renders correct state

```typescript
// Instead of useState
const [filter, setFilter] = useQueryState('filter')
// URL: ?filter=active

// Filters, sorts, tabs, pagination all in URL
```

### Security

- **SQL Injection**: Drizzle ORM uses parameterized queries
- **XSS**: React escapes output by default
- **CSRF**: Better Auth handles token validation
- **Passwords**: Hashed with bcrypt (never stored plain)
- **Data at rest**: Neon encrypts with AES-256

### Database Scaling Strategy

Current: 0.04 GB used. Can handle 100+ workspaces before hitting 1GB.

When needed:
1. Indexes on workspace_id (already planned)
2. Row-Level Security (Postgres enforces isolation)
3. Connection pooling (Neon handles this)
4. Archival for old data
5. Read replicas (if millions of users)

---

## Data Model

### Core Tables (workspace-scoped)

All business data has `workspace_id`:

```sql
products (workspace_id, ...)
orders (workspace_id, ...)
customers (workspace_id, ...)
subscriptions (workspace_id, ...)
inventory (workspace_id, ...)
channels (workspace_id, ...)
```

### Platform Tables (global)

```sql
users (id, email, name, preferences, ...)
workspaces (id, name, owner_id, subscription_tier, ...)
workspace_members (workspace_id, user_id, role, ...)
storefronts (workspace_id, domain, api_key, ...)
friendships (user_id, friend_id, status, ...)
direct_messages (sender_id, recipient_id, ...)
```

---

## Implementation Status

### Completed (60%)

**Infrastructure:**
- [x] Neon database (multi-tenant ready)
- [x] Pusher (real-time messaging)
- [x] Google OAuth
- [x] Vercel deployment
- [x] LiveKit (voice/video)
- [x] Sentry (error tracking)
- [x] Polar (billing configured)

**Admin Panel:**
- [x] Full dashboard UI
- [x] Products/Orders/Customers/Inventory
- [x] Content CMS
- [x] Team messaging + channels
- [x] Voice/video calls
- [x] Command palette (⌘K)
- [x] Activity log
- [x] Settings pages
- [x] Notification system
- [x] Live data updates
- [x] Presence system

### Next Priority

- [ ] **nuqs URL state** — All tables, filters, tabs (tomorrow's session)

### In Progress

- [ ] Multi-tenant workspace isolation
- [ ] Storefront API (headless mode)
- [ ] Subscription tier enforcement

### Planned (40%)

**Multi-Tenant:**
- [ ] Workspace CRUD
- [ ] Member invites
- [ ] Role permissions
- [ ] Feature gating by tier

**Communication:**
- [ ] Cross-workspace DMs
- [ ] User discovery
- [ ] Friend system

**Automation:**
- [ ] Workflow builder integration
- [ ] Trigger system
- [ ] Action executors

**API:**
- [ ] Storefront API endpoints
- [ ] API key management
- [ ] Rate limiting

**Native Apps:**
- [ ] Tauri desktop app
- [ ] React Native mobile app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript (strict) |
| Monorepo | pnpm + Turborepo |
| ORM | Drizzle ORM |
| Database | Neon PostgreSQL 17 |
| Cache | Redis (Upstash) |
| Auth | Better Auth |
| Payments | Polar |
| Real-time | Pusher |
| Calls | LiveKit |
| UI | shadcn/ui |
| Icons | Hugeicons |
| Styling | Tailwind CSS 4 |
| Desktop | Tauri (planned) |
| Mobile | React Native (planned) |
| Automation | Custom (n8n-inspired) |

---

## Environment Variables

```env
# Required
DATABASE_URL=
REDIS_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# Optional
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=
POLAR_WEBHOOK_SECRET=
RESEND_WEBHOOK_SECRET=
```

---

## Development Commands

```bash
pnpm docker:up      # Start local services
pnpm db:push        # Push schema to database
pnpm db:seed        # Seed development data
pnpm dev            # Start dev server
pnpm build          # Production build
```

---

## Timeline

MVP target: 2 weeks

**Week 1:**
- Workspace model + isolation
- Storefront API basics
- Subscription tier enforcement

**Week 2:**
- Cross-workspace communication
- Automation builder integration
- Polish + testing

Post-MVP:
- Native apps
- AI features
- Advanced automation
