-- Adds a substring search index without changing profile records.
-- Re-runnable. The rebuild also indexes profiles that already exist.
CREATE VIRTUAL TABLE IF NOT EXISTS creator_search_v1 USING fts5(
  name, username, location, bio, website,
  content='creator', content_rowid='rowid', tokenize='trigram'
);
CREATE TRIGGER IF NOT EXISTS creator_search_v1_ai AFTER INSERT ON creator BEGIN
  INSERT INTO creator_search_v1(rowid,name,username,location,bio,website)
  VALUES(new.rowid,new.name,new.username,new.location,new.bio,new.website);
END;
CREATE TRIGGER IF NOT EXISTS creator_search_v1_ad AFTER DELETE ON creator BEGIN
  INSERT INTO creator_search_v1(creator_search_v1,rowid,name,username,location,bio,website)
  VALUES('delete',old.rowid,old.name,old.username,old.location,old.bio,old.website);
END;
CREATE TRIGGER IF NOT EXISTS creator_search_v1_au AFTER UPDATE OF name,username,location,bio,website ON creator
WHEN old.name IS NOT new.name OR old.username IS NOT new.username
  OR old.location IS NOT new.location OR old.bio IS NOT new.bio OR old.website IS NOT new.website
BEGIN
  INSERT INTO creator_search_v1(creator_search_v1,rowid,name,username,location,bio,website)
  VALUES('delete',old.rowid,old.name,old.username,old.location,old.bio,old.website);
  INSERT INTO creator_search_v1(rowid,name,username,location,bio,website)
  VALUES(new.rowid,new.name,new.username,new.location,new.bio,new.website);
END;
INSERT INTO creator_search_v1(creator_search_v1) VALUES('rebuild');
