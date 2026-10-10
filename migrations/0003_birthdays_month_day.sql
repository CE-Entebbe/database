-- Birthdays: month + day required, year optional (members, spouses, children).
ALTER TABLE members ADD COLUMN birth_month INTEGER CHECK (birth_month BETWEEN 1 AND 12);
ALTER TABLE members ADD COLUMN birth_day INTEGER CHECK (birth_day BETWEEN 1 AND 31);
ALTER TABLE members ADD COLUMN birth_year INTEGER;
UPDATE members SET birth_year = CAST(substr(dob,1,4) AS INTEGER), birth_month = CAST(substr(dob,6,2) AS INTEGER), birth_day = CAST(substr(dob,9,2) AS INTEGER) WHERE dob IS NOT NULL;
ALTER TABLE members DROP COLUMN dob;

ALTER TABLE relatives ADD COLUMN birth_month INTEGER CHECK (birth_month BETWEEN 1 AND 12);
ALTER TABLE relatives ADD COLUMN birth_day INTEGER CHECK (birth_day BETWEEN 1 AND 31);
ALTER TABLE relatives ADD COLUMN birth_year INTEGER;
UPDATE relatives SET birth_year = CAST(substr(dob,1,4) AS INTEGER), birth_month = CAST(substr(dob,6,2) AS INTEGER), birth_day = CAST(substr(dob,9,2) AS INTEGER) WHERE dob IS NOT NULL;
ALTER TABLE relatives DROP COLUMN dob;
