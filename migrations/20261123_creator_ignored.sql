-- Apply once to each database. No creator is removed by this migration.
CREATE TABLE IF NOT EXISTS creator_ignored (
 username TEXT PRIMARY KEY CHECK(username = lower(username) AND substr(username,1,1) = '@' AND length(username) BETWEEN 2 AND 65 AND substr(username,2) NOT GLOB '*[^a-z0-9_.-]*'),
 reason TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- Protect every import path, including old INSERT/UPSERT/REPLACE SQL files.
CREATE TRIGGER IF NOT EXISTS creator_ignore_insert BEFORE INSERT ON creator
WHEN EXISTS (SELECT 1 FROM creator_ignored WHERE username = '@' || lower(ltrim(trim(NEW.username), '@')))
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER IF NOT EXISTS creator_ignore_update BEFORE UPDATE ON creator
WHEN EXISTS (SELECT 1 FROM creator_ignored WHERE username = '@' || lower(ltrim(trim(NEW.username), '@')))
BEGIN SELECT RAISE(IGNORE); END;
