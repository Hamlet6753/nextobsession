-- Apply once to each database. Existing creators retain NULL for both fields.
ALTER TABLE creator ADD COLUMN age INTEGER CHECK (age IS NULL OR (typeof(age) = 'integer' AND age BETWEEN 18 AND 120));
ALTER TABLE creator ADD COLUMN gender TEXT CHECK (gender IS NULL OR gender IN ('female','male','nonbinary','other'));
