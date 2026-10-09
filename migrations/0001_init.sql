-- Churches: parent_id NULL = main church; small churches point to the main church.
CREATE TABLE churches (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES churches(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Global settings (key/value). cells_enabled = 'true' | 'false'.
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO settings (key, value) VALUES ('cells_enabled', 'false');

-- Pastoral Care Fellowships: a cluster of cells within one church.
CREATE TABLE pcfs (
  id INTEGER PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (church_id, name)
);

-- Cells: belong to a PCF; a cell's church is its PCF's church.
CREATE TABLE cells (
  id INTEGER PRIMARY KEY,
  pcf_id INTEGER NOT NULL REFERENCES pcfs(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (pcf_id, name)
);

-- Members: cell is optional. access_code lets a member open their own page.
CREATE TABLE members (
  id INTEGER PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cell_id INTEGER REFERENCES cells(id),
  access_code TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX members_church ON members(church_id);

-- Leadership roles (admin-only, never shown to members).
CREATE TABLE member_roles (
  id INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('COORDINATOR','PCF_LEADER','ASST_PCF_LEADER',
    'CELL_LEADER','ASST_CELL_LEADER','BIBLE_STUDY_TEACHER')),
  pcf_id INTEGER REFERENCES pcfs(id),
  cell_id INTEGER REFERENCES cells(id),
  CHECK (role NOT IN ('PCF_LEADER','ASST_PCF_LEADER') OR (pcf_id IS NOT NULL AND cell_id IS NULL)),
  CHECK (role NOT IN ('CELL_LEADER','ASST_CELL_LEADER') OR (cell_id IS NOT NULL AND pcf_id IS NULL))
);
CREATE UNIQUE INDEX member_roles_uniq ON member_roles(member_id, role, IFNULL(pcf_id,0), IFNULL(cell_id,0));

-- Which churches a coordinator covers.
CREATE TABLE coordinator_churches (
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  church_id INTEGER NOT NULL REFERENCES churches(id),
  PRIMARY KEY (member_id, church_id)
);
