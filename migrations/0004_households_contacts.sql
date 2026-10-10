-- Households (shared children + anniversary), alternative phones, operators, global unique contacts, spouse linking.

-- 1. Re-normalise existing phones to 256XXXXXXXXX.
UPDATE members SET phone = replace(replace(replace(replace(phone,' ',''),'-',''),'+',''),'(','') WHERE phone IS NOT NULL;
UPDATE members SET phone = replace(phone,')','') WHERE phone IS NOT NULL;
UPDATE members SET phone = '256' || substr(phone,2) WHERE phone LIKE '0%' AND length(phone) = 10;
UPDATE members SET phone = '256' || phone WHERE length(phone) = 9 AND phone GLOB '[0-9]*';

-- 2. Households: one per existing member; anniversary moves here.
CREATE TABLE households (
  id INTEGER PRIMARY KEY,
  anniversary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO households (id, anniversary) SELECT id, anniversary FROM members;
ALTER TABLE members ADD COLUMN household_id INTEGER REFERENCES households(id);
UPDATE members SET household_id = id;
ALTER TABLE members DROP COLUMN anniversary;
CREATE INDEX members_household ON members(household_id);

-- 3. Contacts + operators.
ALTER TABLE members ADD COLUMN phone_alt TEXT;
ALTER TABLE members ADD COLUMN phone_operator TEXT;
ALTER TABLE members ADD COLUMN phone_alt_operator TEXT;
UPDATE members SET phone_operator = CASE
  WHEN phone IS NULL THEN NULL
  WHEN substr(phone,1,5) IN ('25676','25677','25678','25679') OR substr(phone,1,4) = '2563' THEN 'MTN'
  WHEN substr(phone,1,5) IN ('25670','25674','25675') OR substr(phone,1,6) IN ('256730','256731') OR substr(phone,1,5) = '25620' THEN 'Airtel'
  ELSE 'Other' END;

ALTER TABLE relatives ADD COLUMN household_id INTEGER REFERENCES households(id);
UPDATE relatives SET household_id = (SELECT household_id FROM members m WHERE m.id = relatives.member_id);
ALTER TABLE relatives ADD COLUMN phone TEXT;
ALTER TABLE relatives ADD COLUMN phone_alt TEXT;
ALTER TABLE relatives ADD COLUMN email TEXT;
ALTER TABLE relatives ADD COLUMN phone_operator TEXT;
ALTER TABLE relatives ADD COLUMN phone_alt_operator TEXT;
CREATE INDEX relatives_household ON relatives(household_id);
-- No duplicate children in a household (same first name + birthday).
CREATE UNIQUE INDEX relatives_child_uniq ON relatives(household_id, lower(first_name), birth_month, birth_day) WHERE relation = 'child';

-- 4. Every phone (primary or alternative) and email belongs to exactly one person (member or spouse record).
CREATE TABLE identifiers (
  value TEXT PRIMARY KEY,            -- normalised phone digits or lower-cased email
  member_id INTEGER,
  relative_id INTEGER
);
INSERT INTO identifiers (value, member_id) SELECT phone, id FROM members WHERE phone IS NOT NULL;
INSERT INTO identifiers (value, member_id) SELECT lower(email), id FROM members WHERE email IS NOT NULL;

CREATE TRIGGER members_ids_ins AFTER INSERT ON members BEGIN INSERT INTO identifiers(value, member_id) SELECT v, NEW.id FROM (SELECT NEW.phone AS v UNION ALL SELECT NEW.phone_alt UNION ALL SELECT lower(NEW.email)) WHERE v IS NOT NULL; END;
CREATE TRIGGER members_ids_upd AFTER UPDATE OF phone, phone_alt, email ON members BEGIN DELETE FROM identifiers WHERE member_id = OLD.id; INSERT INTO identifiers(value, member_id) SELECT v, NEW.id FROM (SELECT NEW.phone AS v UNION ALL SELECT NEW.phone_alt UNION ALL SELECT lower(NEW.email)) WHERE v IS NOT NULL; END;
CREATE TRIGGER members_ids_del AFTER DELETE ON members BEGIN DELETE FROM identifiers WHERE member_id = OLD.id; END;
CREATE TRIGGER relatives_ids_ins AFTER INSERT ON relatives BEGIN INSERT INTO identifiers(value, relative_id) SELECT v, NEW.id FROM (SELECT NEW.phone AS v UNION ALL SELECT NEW.phone_alt UNION ALL SELECT lower(NEW.email)) WHERE v IS NOT NULL; END;
CREATE TRIGGER relatives_ids_upd AFTER UPDATE OF phone, phone_alt, email ON relatives BEGIN DELETE FROM identifiers WHERE relative_id = OLD.id; INSERT INTO identifiers(value, relative_id) SELECT v, NEW.id FROM (SELECT NEW.phone AS v UNION ALL SELECT NEW.phone_alt UNION ALL SELECT lower(NEW.email)) WHERE v IS NOT NULL; END;
CREATE TRIGGER relatives_ids_del AFTER DELETE ON relatives BEGIN DELETE FROM identifiers WHERE relative_id = OLD.id; END;

-- 5. Spouse link requests: the existing account holder confirms before households merge.
CREATE TABLE spouse_links (
  id INTEGER PRIMARY KEY,
  from_member INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (from_member <> to_member)
);
CREATE UNIQUE INDEX spouse_links_pending ON spouse_links(from_member, to_member) WHERE status = 'pending';
