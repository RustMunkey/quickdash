# Generic Content Collections System

## Context

Quickdash currently has 4 hardcoded content types (FAQ, Stats, Testimonials, Site Content) with specific tables, API endpoints, and admin pages — built specifically for Gemsutopia. This doesn't scale. If a portfolio site joins, they need "Projects" and "Skills." If a restaurant joins, they need "Menu Items" and "Hours." We can't create new tables and endpoints for every user.

**Goal:** Replace the hardcoded content types with a generic, schema-driven collections system. One set of tables, one API endpoint, one admin UI — serves any content type for any user. Users define their own content types through the admin dashboard, and the system auto-generates the API and management interface.

**What stays:**
- Blog Posts, Site Pages, Media Library (specialized features with complex behavior)
- Site Content key-value store (already generic)
- All e-commerce features (products, orders, etc.)
- **Storefront/Admin API key system** — users still add `X-Storefront-Key` to their env.local/Vercel. The SDK and `withStorefrontAuth` wrapper stay exactly the same. We're just replacing the hardcoded endpoints with generic ones.

**What gets replaced:** FAQ table + endpoint, Stats table + endpoint, Testimonials table + endpoint → all become generic collections.

**Approach:** Build and test everything against local Docker PostgreSQL first. Only push to Neon after confirming everything works locally.

---

## Phase 1: Database Schema

### New file: `packages/db/src/schema/content-collections.ts`

**`content_collections` table:**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom |
| workspaceId | uuid FK→workspaces | cascade delete |
| name | text NOT NULL | Display name ("FAQ", "Team Members") |
| slug | text NOT NULL | URL-safe ("faq", "team-members") |
| description | text | Optional description shown in admin |
| icon | text | Icon name for sidebar (e.g., "star", "users") |
| schema | jsonb NOT NULL | Field definitions (see below) |
| allowPublicSubmit | boolean | If true, storefront can POST new entries |
| publicSubmitStatus | text DEFAULT 'inactive' | Default isActive for public submissions |
| isActive | boolean DEFAULT true | Collection visibility |
| sortOrder | integer DEFAULT 0 | Sidebar ordering |
| createdAt | timestamp | |
| updatedAt | timestamp | |

- **Unique constraint:** `(workspaceId, slug)`
- **Index:** `content_collections_workspace_idx` on `workspaceId`

**`content_entries` table:**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom |
| collectionId | uuid FK→content_collections | cascade delete |
| workspaceId | uuid FK→workspaces | cascade delete (denormalized for query perf) |
| data | jsonb NOT NULL DEFAULT '{}' | The actual field values |
| isActive | boolean DEFAULT true | Visibility toggle |
| sortOrder | integer DEFAULT 0 | Manual ordering |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| updatedBy | text FK→user | Who last edited |

- **Indexes:** `content_entries_collection_idx` on `collectionId`, `content_entries_workspace_idx` on `workspaceId`

### Schema JSONB Structure

```typescript
type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "image" | "url" | "email" | "date" | "rating" | "color"

type CollectionField = {
  key: string           // "question", "name", "rating"
  label: string         // "Question", "Full Name"
  type: FieldType
  required?: boolean
  placeholder?: string
  defaultValue?: unknown
  options?: { label: string; value: string }[]  // for "select" type
}

type CollectionSchema = {
  fields: CollectionField[]
  settings: {
    titleField: string           // field key used as display title in table
    descriptionField?: string    // optional subtitle in table
    imageField?: string          // optional thumbnail column
    defaultSort?: string         // "sortOrder" | field key
    defaultSortDir?: "asc" | "desc"
  }
}
```

### Export from schema index
Add `export * from "./content-collections"` to `packages/db/src/schema/index.ts`.

### Push to local DB
`npx drizzle-kit push` (local Docker only — Neon push deferred until verified)

---

## Phase 2: Storefront API Endpoint

### New file: `apps/admin/app/api/storefront/collections/[slug]/route.ts`

**`GET /api/storefront/collections/:slug`**
- Auth: `withStorefrontAuth` (same API key system as before)
- Lookup collection by `slug` + `storefront.workspaceId`
- Return entries where `isActive = true`, ordered by `sortOrder` ASC
- Support query param filters on data fields: `?filter[status]=approved&filter[isFeatured]=true`
  - Translates to: `WHERE data->>'status' = 'approved' AND data->>'isFeatured' = 'true'`
- Support `?sort=createdAt&order=desc`
- Response: `{ collection: { name, slug, description }, entries: [{ id, data, sortOrder, createdAt }] }`

### New file: `apps/admin/app/api/storefront/collections/[slug]/entries/route.ts`

**`POST /api/storefront/collections/:slug/entries`**
- Auth: `withStorefrontAuth`
- Check `collection.allowPublicSubmit === true`, else 403
- Validate submitted data against collection schema (required fields)
- Create entry with `isActive = false` (or whatever `publicSubmitStatus` says) — needs admin moderation
- Response: `{ entry: { id, data, createdAt } }`

### New file: `apps/admin/app/api/storefront/collections/route.ts`

**`GET /api/storefront/collections`**
- Auth: `withStorefrontAuth`
- List all active collections for workspace (name, slug, description, field count)
- Response: `{ collections: [{ name, slug, description }] }`

### Remove old endpoints (after migration verified):
- `apps/admin/app/api/storefront/faq/route.ts` → DELETE
- `apps/admin/app/api/storefront/stats/route.ts` → DELETE
- `apps/admin/app/api/storefront/testimonials/route.ts` → DELETE

### Keep:
- `apps/admin/app/api/storefront/site-content/route.ts` → STAYS (key-value is a different pattern)

---

## Phase 3: Admin Server Actions

### New file: `apps/admin/app/(dashboard)/content/collections/actions.ts`

**Collection CRUD:**
- `getCollections()` — list all collections for workspace
- `getCollection(slug: string)` — get single collection with its schema
- `createCollection(data: { name, slug, description, icon, schema, allowPublicSubmit })` — create new collection
- `updateCollection(id, data)` — update collection metadata/schema
- `deleteCollection(id)` — delete collection + cascade entries

**Entry CRUD:**
- `getEntries(collectionId, params?: { page, pageSize, search, filters })` — paginated entries
- `createEntry(collectionId, data: Record<string, unknown>)` — create entry
- `updateEntry(entryId, data)` — update entry data/isActive/sortOrder
- `deleteEntry(entryId)` — delete single entry
- `bulkDeleteEntries(ids: string[])` — bulk delete
- `bulkToggleEntries(ids: string[], isActive: boolean)` — bulk activate/deactivate

All actions use `requireContentPermission()` from existing `content/actions.ts`.

---

## Phase 4: Admin UI Pages

### 4a. Collections Manager Page
**File:** `apps/admin/app/(dashboard)/content/collections/page.tsx`

Server component that lists all collections in a DataTable. Columns: Name, Slug, Entry Count, Active toggle, Actions (Edit/Delete). "New Collection" button opens dialog.

### 4b. Collection Entries Page
**File:** `apps/admin/app/(dashboard)/content/collections/[slug]/page.tsx`

Server component that fetches the collection schema + entries. Renders a **dynamic DataTable** where columns are generated from the schema's fields.

**File:** `apps/admin/app/(dashboard)/content/collections/[slug]/entries-table.tsx`

Client component. Key features:
- **Dynamic columns** — generated from `collection.schema.fields`. Each field becomes a column. The `titleField` renders as bold. Boolean fields render as switches. Select fields render as badges.
- **Dynamic create/edit form** — dialog with fields rendered by type (see FieldRenderer below)
- **Bulk actions** — delete, activate/deactivate
- **Search** — searches across the `titleField` value
- Collection settings button (opens schema editor dialog)

### 4c. Dynamic Field Renderer
**File:** `apps/admin/app/(dashboard)/content/collections/[slug]/field-renderer.tsx`

Shared component that renders a form field based on its type definition:
- `text` → `<Input />`
- `textarea` → `<Textarea rows={3} />`
- `number` → `<Input type="number" />`
- `boolean` → `<Switch />`
- `select` → `<Select>` with options
- `image` → `<Input type="url" />` (later: media picker)
- `url` → `<Input type="url" />`
- `email` → `<Input type="email" />`
- `date` → `<Input type="date" />`
- `rating` → `<Input type="number" min={1} max={5} />`
- `color` → `<Input type="color" />`

### 4d. Collection Schema Editor
**File:** `apps/admin/app/(dashboard)/content/collections/[slug]/schema-editor.tsx`

Dialog/drawer component for editing collection schema:
- List of fields with key, label, type, required checkbox
- Add field button
- Remove field button
- Reorder fields (up/down buttons for v1, drag later)
- Collection settings: name, slug, description, icon, allowPublicSubmit

### 4e. New Collection Page
**File:** `apps/admin/app/(dashboard)/content/collections/new/page.tsx`

Two options:
1. **Start from template** — pre-defined field schemas for common types (FAQ, Testimonials, Team Members, Gallery, Partners, etc.)
2. **Start blank** — empty collection, add fields manually

Template definitions are a static array in a `collection-templates.ts` file.

---

## Phase 5: Sidebar Integration

### Modify: `apps/admin/app/(dashboard)/layout.tsx`
Add query to fetch workspace collections and pass to sidebar.

### Modify: `apps/admin/components/app-sidebar.tsx`
Replace hardcoded FAQ/Testimonials/Stats entries with dynamic collections:
```
Content
├── Blog Posts
├── Pages
├── {collection.name}          ← dynamic, one per collection
├── ...more collections...
├── All Collections            ← manage collections page
├── Site Content
├── Media Library
```

---

## Phase 6: Data Migration

### 6a. Create starter collections for ALL existing workspaces
SQL migration script to create FAQ, Stats, and Testimonials collections from existing table data.

### 6b. Migrate entry data
INSERT INTO content_entries from old faq, stats, testimonials tables.

### 6c. Verify data integrity
Count rows: old tables vs new entries per collection.

---

## Phase 7: Gemsutopia Update (after Quickdash verified)

### Modify: `/Users/ash/Desktop/gemsutopia/apps/web/src/lib/storefront-client.ts`
- Add generic `collections` namespace
- Keep `faq`, `stats`, `testimonials`, `siteContent` as convenience wrappers calling `collections` under the hood
- Existing `store.faq.list()` calls still work without changing page.tsx

### Modify: `apps/web/src/app/api/reviews/route.ts`
- Replace direct DB write with `store.collections.submit('testimonials', {...})`
- Gemsutopia can remove `DATABASE_URL` and `WORKSPACE_ID` env vars

---

## Phase 8: Cleanup

After migration is verified working:

1. **Delete old storefront endpoints:** faq, stats, testimonials route files
2. **Delete old admin pages:** content/faq, content/stats, content/testimonials dirs
3. **Remove old server actions** from `content/actions.ts`: FAQ, Stats, Testimonials functions
4. **Old tables:** Leave in DB as backup. Remove schema exports later.

---

## File Summary

### New files (Quickdash):
| File | Purpose |
|------|---------|
| `packages/db/src/schema/content-collections.ts` | Drizzle schema for both tables |
| `apps/admin/app/api/storefront/collections/route.ts` | List collections endpoint |
| `apps/admin/app/api/storefront/collections/[slug]/route.ts` | Get collection entries endpoint |
| `apps/admin/app/api/storefront/collections/[slug]/entries/route.ts` | Public submit endpoint |
| `apps/admin/app/(dashboard)/content/collections/actions.ts` | Server actions |
| `apps/admin/app/(dashboard)/content/collections/page.tsx` | Collections list page |
| `apps/admin/app/(dashboard)/content/collections/new/page.tsx` | New collection page |
| `apps/admin/app/(dashboard)/content/collections/[slug]/page.tsx` | Entries page |
| `apps/admin/app/(dashboard)/content/collections/[slug]/entries-table.tsx` | Dynamic entries DataTable |
| `apps/admin/app/(dashboard)/content/collections/[slug]/field-renderer.tsx` | Dynamic form field component |
| `apps/admin/app/(dashboard)/content/collections/[slug]/schema-editor.tsx` | Collection schema editor |
| `apps/admin/app/(dashboard)/content/collections/collection-templates.ts` | Starter templates |

### Modified files (Quickdash):
| File | Change |
|------|--------|
| `packages/db/src/schema/index.ts` | Add content-collections export |
| `apps/admin/app/(dashboard)/layout.tsx` | Fetch collections, pass to sidebar |
| `apps/admin/components/app-sidebar.tsx` | Dynamic collection nav items |
| `apps/admin/app/(dashboard)/content/actions.ts` | Remove FAQ/Stats/Testimonials actions (after verified) |

### Modified files (Gemsutopia — after Quickdash verified):
| File | Change |
|------|--------|
| `apps/web/src/lib/storefront-client.ts` | Add generic `collections` namespace, rewire convenience methods |
| `apps/web/src/app/api/reviews/route.ts` | Replace direct DB write with collections.submit() |

### Deleted files (after migration verified):
| File | Reason |
|------|--------|
| `apps/admin/app/api/storefront/faq/route.ts` | Replaced by generic endpoint |
| `apps/admin/app/api/storefront/stats/route.ts` | Replaced by generic endpoint |
| `apps/admin/app/api/storefront/testimonials/route.ts` | Replaced by generic endpoint |
| `apps/admin/app/(dashboard)/content/faq/*` | Replaced by generic collections UI |
| `apps/admin/app/(dashboard)/content/stats/*` | Replaced by generic collections UI |
| `apps/admin/app/(dashboard)/content/testimonials/*` | Replaced by generic collections UI |

---

## Verification

1. **Push schema to local DB:** `npx drizzle-kit push`
2. **Build Quickdash:** `npx turbo run build --filter=@quickdash/admin`
3. **Run migration script** to seed collections + migrate data (local only)
4. **Test admin UI locally:**
   - Visit `/content/collections` — see FAQ, Stats, Testimonials
   - Click into one — see entries in DataTable
   - Create/edit/delete entries
   - Create a new collection from template
   - Create a blank collection, add fields
   - Verify sidebar shows collections dynamically
5. **Test storefront API locally:**
   - `GET /api/storefront/collections/faq` with API key
   - `GET /api/storefront/collections/testimonials?filter[status]=approved`
   - `POST /api/storefront/collections/testimonials/entries` (public submit)
6. **CONFIRM WITH USER before pushing to Neon**
7. **Push schema to Neon** (only after user approval)
8. **Run migration on Neon**
9. **Update Gemsutopia** to use new generic endpoints
10. **Build Gemsutopia:** `pnpm build:web`
11. **Test Gemsutopia homepage:** FAQ, stats, testimonials load via new generic endpoint

---

## Previous Plans (Reference)

### Channels / Servers — SKIPPED FOR NOW
See git history for the full channels/servers plan. Deferred to focus on content collections system first.
