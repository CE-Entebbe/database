-- Email verification, password-reset rate limiting and Google sign-in.
ALTER TABLE members ADD COLUMN email_verified_at TEXT;
ALTER TABLE members ADD COLUMN verify_sent_at TEXT;
ALTER TABLE members ADD COLUMN reset_sent_at TEXT;
ALTER TABLE members ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX members_google_sub_uniq ON members(google_sub) WHERE google_sub IS NOT NULL;
