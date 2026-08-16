-- Baseline schema. Idempotent (IF NOT EXISTS) so it is safe to run against an
-- existing database whose tables were created out-of-band before migrations
-- were introduced. Migrations 001+ apply incremental changes on top of this.

CREATE TABLE IF NOT EXISTS users (
  address varchar(42) NOT NULL,
  safe_address varchar(42) NOT NULL,
  PRIMARY KEY (address)
);

CREATE TABLE IF NOT EXISTS login_nonces (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  address varchar(42) NOT NULL,
  nonce varchar(64) NOT NULL,
  used tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_login_nonces_address_used (address, used)
);
