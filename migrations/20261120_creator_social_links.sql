-- Run once on each database. NULL = not collected; [] = collected, no public social buttons.
ALTER TABLE creator ADD COLUMN social_links TEXT CHECK (social_links IS NULL OR (json_valid(social_links) AND json_type(social_links) = 'array'));
