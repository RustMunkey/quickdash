-- Content Collections Seed Migration
-- Creates starter FAQ, Stats, and Testimonials collections for all existing workspaces
-- Also migrates data from old faq/stats/testimonials tables if data exists
-- Run this AFTER the content_collections and content_entries tables are created

-- Step 1: Create FAQ collection for each workspace
INSERT INTO content_collections (workspace_id, name, slug, description, icon, schema, allow_public_submit, sort_order)
SELECT id, 'FAQ', 'faq', 'Frequently asked questions', 'help-circle',
  '{"fields":[{"key":"question","label":"Question","type":"text","required":true},{"key":"answer","label":"Answer","type":"textarea","required":true},{"key":"category","label":"Category","type":"text","placeholder":"general"},{"key":"isFeatured","label":"Featured","type":"boolean"}],"settings":{"titleField":"question","descriptionField":"answer","defaultSort":"sortOrder","defaultSortDir":"asc"}}'::jsonb,
  false, 0
FROM workspaces
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- Step 2: Create Stats collection for each workspace
INSERT INTO content_collections (workspace_id, name, slug, description, icon, schema, allow_public_submit, sort_order)
SELECT id, 'Stats', 'stats', 'Key statistics and numbers', 'bar-chart',
  '{"fields":[{"key":"title","label":"Title","type":"text","required":true},{"key":"value","label":"Value","type":"text","required":true},{"key":"description","label":"Description","type":"textarea"},{"key":"icon","label":"Icon","type":"text"}],"settings":{"titleField":"title","descriptionField":"description","defaultSort":"sortOrder","defaultSortDir":"asc"}}'::jsonb,
  false, 1
FROM workspaces
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- Step 3: Create Testimonials collection for each workspace
INSERT INTO content_collections (workspace_id, name, slug, description, icon, schema, allow_public_submit, public_submit_status, sort_order)
SELECT id, 'Testimonials', 'testimonials', 'Customer reviews and testimonials', 'star',
  '{"fields":[{"key":"reviewerName","label":"Reviewer Name","type":"text","required":true},{"key":"reviewerEmail","label":"Reviewer Email","type":"email"},{"key":"rating","label":"Rating","type":"rating","required":true},{"key":"title","label":"Title","type":"text"},{"key":"content","label":"Content","type":"textarea","required":true},{"key":"status","label":"Status","type":"select","required":true,"options":[{"label":"Pending","value":"pending"},{"label":"Approved","value":"approved"},{"label":"Rejected","value":"rejected"}]},{"key":"isFeatured","label":"Featured","type":"boolean"}],"settings":{"titleField":"reviewerName","descriptionField":"content","defaultSort":"createdAt","defaultSortDir":"desc"}}'::jsonb,
  true, 'inactive', 2
FROM workspaces
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- Step 4: Migrate FAQ entries (only if old faq table has data)
INSERT INTO content_entries (collection_id, workspace_id, data, is_active, sort_order, created_at, updated_at)
SELECT cc.id, f.workspace_id,
  jsonb_build_object('question', f.question, 'answer', f.answer, 'category', f.category, 'isFeatured', f.is_featured),
  f.is_active, f.sort_order, f.created_at, f.updated_at
FROM faq f
JOIN content_collections cc ON cc.workspace_id = f.workspace_id AND cc.slug = 'faq';

-- Step 5: Migrate Stats entries
INSERT INTO content_entries (collection_id, workspace_id, data, is_active, sort_order, created_at, updated_at)
SELECT cc.id, s.workspace_id,
  jsonb_build_object('title', s.title, 'value', s.value, 'description', s.description, 'icon', s.icon),
  s.is_active, s.sort_order, s.created_at, s.updated_at
FROM stats s
JOIN content_collections cc ON cc.workspace_id = s.workspace_id AND cc.slug = 'stats';

-- Step 6: Migrate Testimonials entries
INSERT INTO content_entries (collection_id, workspace_id, data, is_active, sort_order, created_at, updated_at)
SELECT cc.id, t.workspace_id,
  jsonb_build_object('reviewerName', t.reviewer_name, 'reviewerEmail', t.reviewer_email, 'rating', t.rating, 'title', t.title, 'content', t.content, 'status', t.status, 'isFeatured', t.is_featured),
  true, 0, t.created_at, t.updated_at
FROM testimonials t
JOIN content_collections cc ON cc.workspace_id = t.workspace_id AND cc.slug = 'testimonials';

-- Verification queries (run manually):
-- SELECT 'old_faq' as source, COUNT(*) FROM faq UNION ALL SELECT 'new_faq', COUNT(*) FROM content_entries WHERE collection_id IN (SELECT id FROM content_collections WHERE slug = 'faq');
-- SELECT 'old_stats' as source, COUNT(*) FROM stats UNION ALL SELECT 'new_stats', COUNT(*) FROM content_entries WHERE collection_id IN (SELECT id FROM content_collections WHERE slug = 'stats');
-- SELECT 'old_testimonials' as source, COUNT(*) FROM testimonials UNION ALL SELECT 'new_testimonials', COUNT(*) FROM content_entries WHERE collection_id IN (SELECT id FROM content_collections WHERE slug = 'testimonials');
