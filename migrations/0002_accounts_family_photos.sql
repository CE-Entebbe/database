-- Member accounts, family (spouse/children) and photo gallery for birthday/anniversary e-cards.
ALTER TABLE members ADD COLUMN title TEXT CHECK (title IN ('Brother','Sister','Pastor','Deacon','Deaconess'));
ALTER TABLE members ADD COLUMN first_name TEXT;
ALTER TABLE members ADD COLUMN last_name TEXT;
ALTER TABLE members ADD COLUMN dob TEXT;             -- YYYY-MM-DD
ALTER TABLE members ADD COLUMN marital_status TEXT CHECK (marital_status IN ('single','married'));
ALTER TABLE members ADD COLUMN anniversary TEXT;     -- wedding date YYYY-MM-DD (married only)
ALTER TABLE members ADD COLUMN has_kids INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN password_hash TEXT;   -- NULL = admin-created, no login yet
-- Phones stored normalised (digits with country code); one account per phone / email.
CREATE UNIQUE INDEX members_phone_uniq ON members(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX members_email_uniq ON members(lower(email)) WHERE email IS NOT NULL;

-- Spouse and children of a member. Children have no title.
CREATE TABLE relatives (
  id INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('spouse','child')),
  title TEXT CHECK (title IN ('Brother','Sister','Pastor','Deacon','Deaconess')),
  first_name TEXT NOT NULL,
  last_name TEXT,
  dob TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (relation = 'spouse' OR title IS NULL)
);
CREATE INDEX relatives_member ON relatives(member_id);
CREATE UNIQUE INDEX relatives_one_spouse ON relatives(member_id) WHERE relation = 'spouse';

-- Photo gallery. relative_id NULL = photo of the member themself.
-- Every upload waits for admin approval before it can be used on an e-card.
-- source is reserved for future AI-generated artwork ('ai').
CREATE TABLE photos (
  id INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relative_id INTEGER REFERENCES relatives(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload','ai')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX photos_member ON photos(member_id);
CREATE INDEX photos_status ON photos(status);
