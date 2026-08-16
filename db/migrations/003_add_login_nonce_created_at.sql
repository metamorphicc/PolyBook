-- Timestamp for login nonce TTL + cleanup. Existing rows get the current time
-- as a sensible default so they age out under the same TTL as new ones.
ALTER TABLE login_nonces
  ADD COLUMN created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
