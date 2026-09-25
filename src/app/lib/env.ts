import "server-only";

function readEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function serverEnv() {
  const env = {
    db: {
      host: readEnv("DB_HOST", process.env.MYSQLHOST),
      port: Number(readEnv("DB_PORT", process.env.MYSQLPORT ?? "3306")),
      user: readEnv("DB_USER", process.env.MYSQLUSER),
      password: readEnv("DB_PASSWORD", process.env.MYSQLPASSWORD),
      database: readEnv("DB_DATABASE", process.env.MYSQLDATABASE),
    },
    jwtSecret: readEnv("JWT_SECRET"),
    polyBuilder: {
      key: readEnv("POLY_BUILDER_API_KEY", process.env.POLYMARKET_BUILDER_API_KEY),
      secret: readEnv("POLY_BUILDER_SECRET", process.env.POLYMARKET_BUILDER_SECRET),
      passphrase: readEnv(
        "POLY_BUILDER_PASSPHRASE",
        process.env.POLYMARKET_BUILDER_PASSPHRASE,
      ),
    },
  };

  if (!Number.isInteger(env.db.port) || env.db.port <= 0) {
    throw new Error("DB_PORT must be a positive integer");
  }

  return env;
}
