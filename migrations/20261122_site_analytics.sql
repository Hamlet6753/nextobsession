-- Independent of creator data. Safe to re-run.
CREATE TABLE IF NOT EXISTS site_analytics (
 event_id TEXT PRIMARY KEY,
 occurred_at INTEGER NOT NULL,
 event_type TEXT NOT NULL CHECK(event_type IN ('pageview','click')),
 session_id TEXT NOT NULL,
 path TEXT NOT NULL,
 page_kind TEXT NOT NULL,
 action TEXT NOT NULL DEFAULT '',
 target TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL,
 medium TEXT NOT NULL,
 campaign TEXT NOT NULL DEFAULT '',
 landing_path TEXT NOT NULL,
 device TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_time ON site_analytics(occurred_at);
CREATE INDEX IF NOT EXISTS analytics_path_time ON site_analytics(path,occurred_at);
CREATE INDEX IF NOT EXISTS analytics_source_time ON site_analytics(source,occurred_at);
CREATE INDEX IF NOT EXISTS analytics_type_time ON site_analytics(event_type,occurred_at);
