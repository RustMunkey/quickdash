# Quickdash Roadmap: Cleanup → Auth → Web App → Gemsutopia → CMS

## Context

Email BYOK is done but a few platform key leaks remain. The test page should be deleted entirely. Inbox replies need workspace scoping. After cleanup, the admin panel gets gated behind existing accounts, the marketing webapp handles signup, Gemsutopia becomes a fully operational ecommerce store manageable from the admin panel, and eventually the CMS gets overhauled so any user can manage every piece of content on their connected site.

---

## Phase 1: Cleanup (Do First)
**Scope: Small (~1-2 hours)**

### 1A. Delete the developers test page entirely
- **Delete:** `apps/admin/app/(dashboard)/developers/test/` (page.tsx + actions.ts)
- **Remove:** Any sidebar nav link to the test page
- **Remove:** Any imports/references to `sendTestShippingEmail`, `createTestInboxEmail`, `getTestOrders` from other files
- It was a dev-only test page for toasts, error states, emails — no longer needed

### 1B. Fix inbox reply to use workspace-scoped Resend
- **File:** `apps/admin/app/(dashboard)/notifications/messages/actions.ts`
- The reply function sends from `support@quickdash.net` using the platform key
- Fix: Use `getWorkspaceResend(workspace.id)` + `getWorkspaceEmailConfig(workspace.id)`
- Replies from Gemsutopia's inbox should go out from `noreply@gemsutopia.ca` (or whatever their workspace email is), NOT from `support@quickdash.net`
- Also check `apps/admin/app/(dashboard)/messages/actions.ts` for the same issue

### 1C. Confirm platform Resend key usage is correct
After 1A and 1B, the platform `RESEND_API_KEY` should ONLY be used for:
- **Auth transactional emails** (`lib/auth.ts`): password reset, email verification → `noreply@quickdash.net`
- **Contact form** (`apps/web/api/contact/route.ts`): marketing site contact form confirmation
- **Platform email helpers** (`lib/send-email.ts`, `lib/inngest/email-handlers.ts`): only when no `workspaceId` is provided (platform-level operations)

The Quickdash workspace under `admin@quickdash.net` uses the platform key — that's correct since it's your business. Every other workspace uses their own BYOK keys.

---

## Phase 2: Auth Gate for Admin Panel
**Scope: Medium (~4-6 hours) | Prerequisite for Phase 3**

### 2A. Add `middleware.ts` to admin app
- **New file:** `apps/admin/middleware.ts`
- Check for Better Auth session cookie on all routes
- Allow-list: `/login`, `/forgot-password`, `/reset-password`, `/api/auth/*`, `/api/webhooks/*`, `/api/storefront/*`, `/api/v1/*`, `/api/inngest`, `/api/pusher/auth`, `/pricing`
- Redirect unauthenticated users to `/login`

### 2B. Remove signup from admin
- **Remove or redirect:** `apps/admin/app/signup/` → redirect to `https://quickdash.net/signup`
- **Update:** `apps/admin/components/login-form.tsx` — "Sign up" link points to `https://quickdash.net/signup`
- Keep `/login` in admin (existing users go here)

### 2C. Cross-app session sharing
- **File:** `apps/admin/lib/auth.ts`
- Set Better Auth cookie domain to `.quickdash.net` so sessions from `quickdash.net` carry to `app.quickdash.net`
- Add `https://quickdash.net` to `trustedOrigins`
- User signs up on web → session carries → admin recognizes them

---

## Phase 3: Frontend Webapp (`apps/web`)
**Scope: Large (~2-3 days) | Depends on Phase 2**

### 3A. Auth in web app
- **New:** `apps/web/lib/auth.ts` — same DB, secret, social providers, cookie domain `.quickdash.net`
- **New:** `apps/web/app/api/auth/[...all]/route.ts`

### 3B. Signup + onboarding
- **New:** `apps/web/app/signup/` — signup form
- **New:** `apps/web/app/onboarding/` — streamlined flow:
  1. Profile (name, username, avatar)
  2. Tier selection (hobby free / lite / essentials / pro → Polar checkout)
  3. Workspace creation (name, type, domain)
  4. Connect site (GitHub or manual) + optionally select a template (future)
- On completion: set `onboardingCompletedAt`, redirect to `https://app.quickdash.net`

### 3C. Marketing pages
- **Rewrite:** `apps/web/app/page.tsx` — landing page
- **Move:** Pricing from `apps/admin/app/pricing/` → `apps/web/app/pricing/`
- **Keep:** Contact page

### 3D. Deployment
- `apps/web` → `quickdash.net` on Vercel
- `apps/admin` → `app.quickdash.net` (unchanged)

---

## Phase 4: Gemsutopia Ecommerce Setup
**Scope: Medium-Large (~2-3 days) | Can run in parallel with Phase 3**

The goal: Gemsutopia is fully manageable from the Quickdash admin panel. Reese drops his payment keys into the dashboard and starts selling. We build the website so it just works when keys are present.

### 4A. Multi-provider checkout on gemsutopia.ca
- Build a unified checkout flow that dynamically shows payment options based on which keys are configured in the workspace
- **Stripe checkout:** Already exists at `/api/storefront/payments/stripe/checkout` — verify it works with workspace BYOK keys
- **Polar checkout:** New endpoint `apps/admin/app/api/storefront/payments/polar/checkout/route.ts` — uses workspace's Polar credentials
- **Reown/crypto checkout:** New endpoint `apps/admin/app/api/storefront/payments/reown/checkout/route.ts` — uses workspace's WalletConnect project ID + chain config
- **PayPal:** Defer (Reese isn't using it yet), but the BYOK key storage already supports it
- Update Gemsutopia's `CheckoutFlow.tsx` to check which providers have keys and show those options
- Add `payments.createPolarSession()` and `payments.createReownSession()` to the SDK

### 4B. Product + category population
- Operational work in admin UI — create Gemsutopia's product catalog
- Categories, products with variants, images, prices in CAD
- This is data entry, not code

### 4C. Content population via collections (current system)
- Before the CMS overhaul, use existing collections for all site content
- Create/populate: hero, navigation, footer, social-links, about, FAQ, testimonials, stats, partners, etc.
- Gemsutopia's `StorefrontClient` already consumes these

### 4D. Gemsutopia site polish + deploy
- Wire up all admin-managed content to the frontend
- Ensure every piece of text, image, and link comes from the API (no hardcoded content)
- Test full flow: browse → add to cart → checkout → pay → order appears in admin
- Deploy gemsutopia.ca

### 4E. SDK alignment
- Add missing resources to `packages/sdk`: `collections`, `blog`, `pages`, `siteContent`
- Eventually Gemsutopia should use the official SDK package instead of its local `StorefrontClient` copy

---

## Phase 5: CMS Overhaul — Content Zones
**Scope: Very Large (~1-2 weeks) | Saved for later**

### The Problem
Current CMS creates rigid `/pages/slug` and `/collections/slug` URLs. Users can't manage arbitrary content on any page (hero, nav, footer, testimonials, etc.). Collections are being abused as page-content containers with hacky convenience wrappers.

### The Solution: Content Zones
A **content zone** is a named region on any page that contains structured content blocks. Framework-agnostic, API-driven.

### 5A. New database schema
```
contentZones
  - id, workspaceId
  - pageKey (e.g. "home", "about", "*" for global zones like nav/footer)
  - zoneKey (e.g. "hero", "testimonials", "faq", "navigation")
  - schema (JSONB — reuse CollectionSchema from content-collections.ts)
  - sortOrder, isActive, timestamps

contentBlocks
  - id, zoneId, workspaceId
  - data (JSONB — same as contentEntries.data)
  - sortOrder, isActive, timestamps
```

Global zones (`pageKey = "*"`) appear on every page (nav, footer, social links). Otherwise scoped to a specific page route.

### 5B. Admin UI
- **New:** `apps/admin/app/(dashboard)/content/zones/` — page map + zone editor
- Drag-and-drop block ordering, inline field editing (reuse field renderers from collections)
- Page registration: manual or auto-discovered from connected site

### 5C. Storefront API
- `GET /api/storefront/content/:pageKey` — all zones + blocks for a page (merges global)
- `GET /api/storefront/content/:pageKey/:zoneKey` — single zone
- `GET /api/storefront/content/global` — all global zones

### 5D. SDK
```typescript
client.content.forPage("home")        // all zones + blocks for home
client.content.zone("home", "hero")   // just the hero zone
client.content.global()               // nav, footer, socials
```

### 5E. Gemsutopia migration
- Migrate from collection-based content to content zones
- Remove convenience wrapper hacks (`faq.list()`, `testimonials.list()`)
- Every piece of content on gemsutopia.ca flows through content zones API

---

## Phase 6 (Future): Template Store
**Scope: Large | Depends on Phase 3 + 5**

- Framework-agnostic templates (Next.js, Svelte, Angular, vanilla HTML/JS) pre-wired with SDK
- Templates ship with predefined content zones that auto-populate
- Marketplace in `apps/web`
- Payment via Polar
- One template per framework to prove cross-framework compatibility

---

## Execution Order

```
Phase 1 (Cleanup)               — DO FIRST, standalone
    ↓
Phase 2 (Auth Gate)             — next, standalone
    ↓
Phase 3 (Web App)         ←──── depends on Phase 2 (shared auth)
    ↓
Phase 4 (Gemsutopia)            — parallel with Phase 3
    ↓
Phase 5 (CMS Overhaul)          — after Phase 4 (learnings inform design)
    ↓
Phase 6 (Template Store)        — after Phase 3 + 5
```

---

## Verification

- **Phase 1:** No test page in sidebar. Reply from Gemsutopia inbox → email sent from `noreply@gemsutopia.ca`, not `support@quickdash.net`. Grep for `RESEND_API_KEY` confirms only auth/platform usage.
- **Phase 2:** `app.quickdash.net/signup` → redirects to `quickdash.net/signup`. Any admin route without session → `/login`.
- **Phase 3:** Sign up at `quickdash.net/signup` → onboard → land on `app.quickdash.net` with session intact.
- **Phase 4:** Browse gemsutopia.ca → add to cart → checkout with Stripe/Polar/Reown → order appears in Gemsutopia workspace. All content comes from admin, no hardcoded text.
- **Phase 5:** Edit "hero" zone in admin → `GET /api/storefront/content/home/hero` → updated content on gemsutopia.ca.

---
---

# Media Storage Overhaul: Base64 → Blob + Workspace-Scoped Uploads

## Context

Gemsutopia's site is broken because the site content editor stored images as base64 data URLs directly in the `site_content.value` column. The hero images alone are **21 MB** of base64. The API returns a **30 MB JSON response** on every page load, causing `Maximum call stack size exceeded` in Next.js server rendering.

Quickdash already uses Vercel Blob for products, blog, media library, and messages — but the site content editor and collection field renderer have no image upload UI, so base64 got pasted into text fields.

**Goals:**
1. Fix Gemsutopia immediately (migrate base64 → blob URLs)
2. Prevent this from ever happening again (proper upload UI everywhere)
3. Workspace-scope all uploads (`media/{workspaceId}/...`)
4. Add storage limits per tier to prevent storage abuse at scale

---

## Step 1: Workspace-Scope the Upload Route
**File:** `apps/admin/app/api/upload/route.ts`

- Change blob path from `products/{timestamp}-{file}` to `media/{workspaceId}/{timestamp}-{file}`
- Require workspace context (use `requireWorkspace()` or get from session)
- Add storage tracking: after upload, record file size in `media_items` table or increment workspace storage counter
- Add storage limit check BEFORE upload: query current usage, compare against tier limit, reject if over

---

## Step 2: Migrate Existing Base64 Images to Blob
**New file:** `apps/admin/app/api/admin/migrate-media/route.ts` (one-time migration endpoint, protected)

Safe migration process:
1. Query all `site_content` rows where `value LIKE 'data:image%'` (across ALL workspaces)
2. For each row:
   a. Extract MIME type and base64 data from the data URL
   b. Convert to Buffer
   c. Upload to Vercel Blob at `media/{workspaceId}/site-content/{key}-{timestamp}.{ext}`
   d. **Verify** the upload succeeded (blob URL is returned, non-empty)
   e. Update the DB row: `SET value = blob_url WHERE id = row.id AND value = original_base64_value` (optimistic lock — only updates if value hasn't changed)
   f. Log: `[Migration] {key}: {size} → {blob_url}`
3. Also scan `content_entries.data` JSONB for any base64 values and migrate those
4. Return summary: `{ migrated: N, failed: N, skipped: N, details: [...] }`

**Safety guarantees:**
- Optimistic locking on update (WHERE value = old_value)
- Upload verified before any DB write
- Idempotent: re-running skips already-migrated rows (value won't start with `data:image`)
- Dry-run mode: add `?dry=true` query param to preview without writing
- All operations logged

---

## Step 3: Media Library Picker + Upload Everywhere

Every place that accepts an image (products, auctions, categories, site content, collections, blog) should have two options:
1. **Upload new** — drag-and-drop upload (existing `MediaUploader` component)
2. **Choose from library** — browse existing `media_items` for this workspace

### 3A. Add "Choose from Library" to MediaUploader
**File:** `apps/admin/components/media-uploader.tsx`

- Add a "Media Library" button next to the upload area
- Opens a modal/sheet showing the workspace's `media_items` (grid of thumbnails)
- User clicks an image → it gets added to the selected items
- Reuses the existing media library UI from `content/media/media-library.tsx`

### 3B. Add MediaUploader to Site Content Editor
**File:** `apps/admin/app/(dashboard)/content/site-content/site-content-editor.tsx`

- Detect image fields: `item.type === "image"` OR key ends with `:image` or `:images`
- For image fields: render `MediaUploader` (upload new OR pick from library)
- For `hero:images` (JSON array): multi-image uploader
- Show image preview for existing URL values

### 3C. Add MediaUploader to Collection Field Renderer
**File:** `apps/admin/app/(dashboard)/content/collections/[slug]/field-renderer.tsx`

- `case "image"`: render `MediaUploader` with `maxItems={1}` instead of plain URL input
- Upload new or pick from library

### 3D. Verify Categories Have Image Upload
- Categories should have drag-and-drop image upload (not just URL input)
- Same MediaUploader component with library picker

---

## Step 4: Storage Limits Per Tier
**Tracks:** total bytes uploaded per workspace

### 4A. Add storage tracking column
- Add `storageUsedBytes: bigint` to `workspaces` table (default 0)
- Increment on upload, decrement on delete

### 4B. Add storage limit to tier config
| Tier | Storage Limit |
|------|--------------|
| hobby | 500 MB |
| lite | 2 GB |
| essentials | 10 GB |
| pro | 50 GB |
| beta | 50 GB |

### 4C. Per-file size limits
| File Type | Max Size |
|-----------|----------|
| Images (jpg, png, webp, gif, svg) | 10 MB |
| Videos (mp4, webm, mov) | 100 MB |
| Audio (mp3, wav, flac, ogg, aac, m4a) | 50 MB |

### 4D. Enforce workspace storage limit in upload route
Before uploading, check: `workspace.storageUsedBytes + file.size <= tierLimit`
If over: return `{ error: "Storage limit reached. Upgrade your plan." }` with 413 status.

### 4D. Display on billing page
Show storage usage bar on the billing/settings page: "2.1 GB / 10 GB used"

---

## Step 5: Update `media_items` Table for Proper Tracking

The `media_items` table already tracks: url, filename, mimeType, size, workspaceId. Ensure all uploads (including site content images) create a `media_items` record so we have a central registry of all files.

---

## Execution Order

```
Step 1 (Scope upload route)     — workspace paths + storage tracking
    ↓
Step 2 (Migrate base64)         — fix Gemsutopia NOW
    ↓
Step 3 (Media library picker)   — upload + pick from library everywhere
    ↓
Step 4 (Storage limits)         — tier enforcement
    ↓
Step 5 (Media registry)         — central file tracking
```

Steps 1-2 are urgent (fixes the broken site). Steps 3-5 are preventive.

---

## Verification

1. **Migration safe:** Run with `?dry=true` first, verify output shows correct files and sizes
2. **Migration works:** Run migration, verify `site_content` values are now URLs (not base64), verify blob URLs load in browser
3. **Gemsutopia loads:** After migration, API response < 100KB (was 30MB)
4. **Site renders:** Gemsutopia homepage shows hero images, about sections, quality section, CTA
5. **Upload works:** Upload an image via site content editor → goes to blob, value saved as URL
6. **Library picker:** Click "Media Library" on product form → see existing images → select one
7. **Storage limit:** Upload past tier limit → get 413 error
8. **No data loss:** Every base64 image has a corresponding blob URL. Original data preserved in blob storage permanently.
