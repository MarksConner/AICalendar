ALTER TABLE users
ADD COLUMN password_reset_token TEXT;

ALTER TABLE users
ADD COLUMN password_reset_expires_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN password_reset_sent_at TIMESTAMPTZ;

--TIMESTAMPTZ: Standardize to UTC time