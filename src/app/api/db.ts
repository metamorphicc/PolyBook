import mysql, { type Pool } from "mysql2/promise";
import { serverEnv } from "@/app/lib/env";

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;

  const { db } = serverEnv();
  pool = mysql.createPool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  return pool;
}
