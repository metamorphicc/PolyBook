ALTER TABLE users
  ADD COLUMN deposit_wallet_address varchar(42) NULL UNIQUE AFTER safe_address;
