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

## Phase 5: CMS Overhaul — Headless Content Model
**Scope: Large (~1 week) | Saved for later**

### The Problem
Users can't manage all the content on their connected site from Quickdash. Collections work great for lists of things (FAQ, team members, gallery), but there's no clean way to manage one-off page content (hero heading, footer text, nav links) or link content across types (a blog post's author → a team member entry).

### What We're NOT Building
- **Not a website builder** — no drag-and-drop page layout, no visual editor
- **Not Content Zones** (previous plan) — that couples content to pages, which is the frontend's job
- Quickdash is a **headless CMS** — it stores structured content and serves it via API. The frontend decides what goes where.

### Strategy: Enhance What Already Exists
We already have 80% of a headless CMS. The system is:
1. **Content Collections** (done) — user-defined structured content types with JSONB schemas
2. **Site Content** (done) — key-value store for one-off content, grouped by prefix
3. **Blog Posts + Site Pages** (done) — specialized content types

What's missing is relational power, better API access, and richer field types.

### 5A. Reference field type
**Scope: Medium**

Add a `reference` field type to the collection schema system. A reference field points to entries in another collection.

**Schema change:**
```typescript
// Add to FieldType union:
type FieldType = "text" | "textarea" | ... | "reference"

// Reference fields have extra config:
type CollectionField = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  // ... existing fields ...
  referenceCollection?: string  // slug of the target collection (for type="reference")
  referenceMultiple?: boolean   // allow multiple references (default false)
}
```

**Data storage:** Reference fields store the target entry ID (or array of IDs) in the JSONB data.

**Admin UI:**
- Reference field renders as a searchable dropdown of entries from the target collection
- Shows the entry's titleField as the display label
- Multi-reference renders as a tag input

**API response:** Reference fields are returned as IDs by default. Add `?expand=author,category` query param to inline the referenced entry data.

**Files to modify:**
- `packages/db/src/schema/content-collections.ts` — add type to FieldType union
- `apps/admin/app/(dashboard)/content/collections/[slug]/field-renderer.tsx` — reference picker UI
- `apps/admin/app/(dashboard)/content/collections/[slug]/schema-editor.tsx` — reference field config (pick target collection)
- `apps/admin/app/api/storefront/collections/[slug]/route.ts` — expand query param support
- `apps/admin/app/(dashboard)/content/collections/actions.ts` — entry lookup for reference picker

### 5B. Content bundle endpoint
**Scope: Small**

One API call to fetch multiple collections at once — so a frontend can get a page's worth of content in a single request instead of N requests.

**New endpoint:** `GET /api/storefront/content/bundle`
- Query: `?collections=hero-slides,testimonials,featured-products`
- Optional: `?collections=hero-slides:3,testimonials:5` (with per-collection limits)
- Response:
```json
{
  "hero-slides": { "collection": {...}, "entries": [...] },
  "testimonials": { "collection": {...}, "entries": [...] },
  "featured-products": { "collection": {...}, "entries": [...] }
}
```

**File:** `apps/admin/app/api/storefront/content/bundle/route.ts`

### 5C. Site content storefront API
**Scope: Small**

Expose the key-value `site_content` table to storefronts via API, grouped by prefix.

**New endpoint:** `GET /api/storefront/site/content`
- Returns all site content entries grouped by prefix (text before the colon)
- Response:
```json
{
  "hero": { "heading": "...", "subheading": "...", "image": "https://..." },
  "footer": { "text": "...", "copyright": "..." },
  "nav": { "items": "[{\"label\":\"Home\",\"href\":\"/\"}]" }
}
```

**Optional:** `GET /api/storefront/site/content/:prefix` — just one group

**File:** `apps/admin/app/api/storefront/site/content/route.ts`

### 5D. Rich text field type
**Scope: Medium (defer after 5A-5C)**

Add a `richtext` field type that stores structured content as JSON (TipTap/ProseMirror format) or HTML. This replaces the current plain textarea for content that needs formatting, embedded images, links.

Not urgent — textarea + markdown works fine for v1. Revisit when template developers need it.

### 5E. SDK methods
```typescript
// Bundle fetch — one call for a page's content
client.content.bundle(["hero-slides", "testimonials", "featured-products"])

// Site content — global key-value content
client.site.content()                 // all groups
client.site.content("hero")          // just hero group

// Collections — already exists, enhanced with expand
client.collections.list("team", { expand: ["department"] })
```

### 5F. Execution order
```
5A (Reference fields)      — adds relational power
    ↓
5B (Bundle endpoint)       — one-call page content
    ↓
5C (Site content API)      — expose globals to storefronts
    ↓
5D (Rich text)             — defer, not blocking
```

5A-5C can ship incrementally. Each is independently useful.

---

## Phase 6 (Future): Template Store
**Scope: Large | Depends on Phase 3 + 5**

- Framework-agnostic templates (Next.js, Svelte, Angular, vanilla HTML/JS) pre-wired with SDK
- Templates ship with predefined collections + site content keys that auto-populate on install
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
- **Phase 5:** Create "Team" collection with reference field to "Departments" → API returns expanded data. Bundle endpoint returns multiple collections in one call. Site content API returns grouped key-value content.

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
