-- Timestamp for login nonce TTL + cleanup. Existing rows get the current time
-- as a sensible default so they age out under the same TTL as new ones.
SET @nonce_created_at_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'login_nonces'
    AND column_name = 'created_at'
);

SET @nonce_created_at_migration = IF(
  @nonce_created_at_column_exists = 0,
  'ALTER TABLE login_nonces ADD COLUMN created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1'
);

PREPARE nonce_created_at_statement FROM @nonce_created_at_migration;
EXECUTE nonce_created_at_statement;
DEALLOCATE PREPARE nonce_created_at_statement;
