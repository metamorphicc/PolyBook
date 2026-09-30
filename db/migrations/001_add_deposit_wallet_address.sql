SET @deposit_wallet_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'deposit_wallet_address'
);

SET @deposit_wallet_migration = IF(
  @deposit_wallet_column_exists = 0,
  'ALTER TABLE users ADD COLUMN deposit_wallet_address varchar(42) NULL UNIQUE AFTER safe_address',
  'SELECT 1'
);

PREPARE deposit_wallet_statement FROM @deposit_wallet_migration;
EXECUTE deposit_wallet_statement;
DEALLOCATE PREPARE deposit_wallet_statement;
