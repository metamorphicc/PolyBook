import mysql from "mysql2/promise";
import { serverEnv } from "@/app/lib/env";

const { db } = serverEnv();

export const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
