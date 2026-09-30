import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations",
);
const planOnly = process.argv.includes("--plan");
const unexpectedArguments = process.argv.slice(2).filter((arg) => arg !== "--plan");

function requiredEnv(name, aliases = []) {
  for (const candidate of [name, ...aliases]) {
    const value = process.env[candidate]?.trim();
    if (value) return value;
  }

  const aliasText = aliases.length > 0 ? ` or ${aliases.join(" or ")}` : "";
  throw new Error(`Missing required environment variable: ${name}${aliasText}`);
}

async function migrationFiles() {
  const names = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  if (names.length === 0) throw new Error("No database migrations found");

  const prefixes = new Set();
  const migrations = [];

  for (const filename of names) {
    const match = /^(\d{3})_[a-z0-9_]+\.sql$/.exec(filename);
    if (!match) {
      throw new Error(
        `Invalid migration filename: ${filename}. Expected NNN_lowercase_name.sql`,
      );
    }
    if (prefixes.has(match[1])) {
      throw new Error(`Duplicate migration number: ${match[1]}`);
    }
    prefixes.add(match[1]);

    const sql = await readFile(join(migrationsDirectory, filename), "utf8");
    migrations.push({
      filename,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    });
  }

  return migrations;
}

async function main() {
  if (unexpectedArguments.length > 0) {
    throw new Error(`Unknown argument: ${unexpectedArguments[0]}`);
  }

  const migrations = await migrationFiles();

  if (planOnly) {
    console.log("Database migration plan:");
    for (const migration of migrations) console.log(`- ${migration.filename}`);
    return;
  }

  const portValue = process.env.DB_PORT?.trim() || process.env.MYSQLPORT?.trim() || "3306";
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DB_PORT or MYSQLPORT must be an integer between 1 and 65535");
  }

  const connection = await mysql.createConnection({
    host: requiredEnv("DB_HOST", ["MYSQLHOST"]),
    port,
    user: requiredEnv("DB_USER", ["MYSQLUSER"]),
    password: requiredEnv("DB_PASSWORD", ["MYSQLPASSWORD"]),
    database: requiredEnv("DB_DATABASE", ["MYSQLDATABASE"]),
    multipleStatements: true,
  });

  let lockHeld = false;
  try {
    const [lockRows] = await connection.execute(
      "SELECT GET_LOCK('polybook-schema-migrations', 30) AS acquired",
    );
    lockHeld = lockRows[0]?.acquired === 1;
    if (!lockHeld) throw new Error("Could not acquire the database migration lock");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS polybook_schema_migrations (
        filename varchar(255) NOT NULL,
        checksum char(64) NOT NULL,
        applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (filename)
      )
    `);

    const [appliedRows] = await connection.query(
      "SELECT filename, checksum FROM polybook_schema_migrations",
    );
    const applied = new Map(
      appliedRows.map((row) => [String(row.filename), String(row.checksum)]),
    );

    for (const migration of migrations) {
      const previousChecksum = applied.get(migration.filename);
      if (previousChecksum) {
        if (previousChecksum !== migration.checksum) {
          throw new Error(
            `Applied migration was modified: ${migration.filename}`,
          );
        }
        console.log(`skip ${migration.filename}`);
        continue;
      }

      console.log(`apply ${migration.filename}`);
      await connection.query(migration.sql);
      await connection.execute(
        "INSERT INTO polybook_schema_migrations (filename, checksum) VALUES (?, ?)",
        [migration.filename, migration.checksum],
      );
    }

    console.log("Database migrations are up to date.");
  } finally {
    if (lockHeld) {
      await connection.execute("SELECT RELEASE_LOCK('polybook-schema-migrations')");
    }
    await connection.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database migration failed: ${message}`);
  process.exitCode = 1;
});
