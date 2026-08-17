# Схема БД

Миграции применяются по порядку номеров. Все они идемпотентны или безопасны при
повторном запуске (`IF NOT EXISTS` / `MODIFY`), кроме `ADD COLUMN` — он упадёт с
`Duplicate column name`, если колонка уже есть. Это нормально: значит, миграция
уже применена.

| # | Файл | Что делает |
|---|---|---|
| 000 | `000_create_base_tables.sql` | Базовые `users` и `login_nonces` |
| 001 | `001_add_deposit_wallet_address.sql` | `users.deposit_wallet_address` — торговый кошелёк Polymarket |
| 002 | `002_make_safe_address_nullable.sql` | Снимает `NOT NULL` с легаси-колонки `users.safe_address` |
| 003 | `003_add_login_nonce_created_at.sql` | `login_nonces.created_at` для TTL нонсов SIWE |

## Проверить, что применено

```sql
SHOW COLUMNS FROM users;        -- ждём address, safe_address (NULL: YES), deposit_wallet_address
SHOW COLUMNS FROM login_nonces; -- ждём id, address, nonce, used, created_at
```

## Про `safe_address`

Колонка осталась от старого флоу с Gnosis Safe и **не читается и не пишется ни
одной строкой кода** — сейчас торговый адрес живёт в `deposit_wallet_address`.
Пока она `NOT NULL` без дефолта, создание торгового кошелька падает с
`Field 'safe_address' doesn't have a default value`, потому что `INSERT` в
`api/user/trading-wallet` её не заполняет. Отсюда миграция 002.

Колонка не удаляется, а делается nullable, чтобы не терять данные на старых
строках. Когда убедишься, что они не нужны:

```sql
ALTER TABLE users DROP COLUMN safe_address;
```
