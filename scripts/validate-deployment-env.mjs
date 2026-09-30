const mode = process.env.NEXT_PUBLIC_APP_MODE ?? "portfolio";

if (mode !== "portfolio" && mode !== "trading") {
  fail(`NEXT_PUBLIC_APP_MODE must be "portfolio" or "trading", received "${mode}".`);
}

if (mode === "portfolio") {
  console.log("deployment preflight ok: portfolio mode");
  process.exit(0);
}

const errors = [];

function value(name, aliases = []) {
  for (const candidate of [name, ...aliases]) {
    const current = process.env[candidate]?.trim();
    if (current) return current;
  }

  errors.push(
    aliases.length > 0
      ? `${name} is required (accepted aliases: ${aliases.join(", ")})`
      : `${name} is required`,
  );
  return undefined;
}

function fail(message) {
  console.error(`deployment preflight failed:\n- ${message}`);
  process.exit(1);
}

const appUrlValue = value("NEXT_PUBLIC_APP_URL");
value("NEXT_PUBLIC_REOWN_PROJECT_ID");
value("DB_HOST", ["MYSQLHOST"]);
const dbPortValue = process.env.DB_PORT?.trim() || process.env.MYSQLPORT?.trim() || "3306";
value("DB_USER", ["MYSQLUSER"]);
value("DB_PASSWORD", ["MYSQLPASSWORD"]);
value("DB_DATABASE", ["MYSQLDATABASE"]);
const jwtSecret = value("JWT_SECRET");
value("POLY_BUILDER_API_KEY", ["POLYMARKET_BUILDER_API_KEY"]);
value("POLY_BUILDER_SECRET", ["POLYMARKET_BUILDER_SECRET"]);
value("POLY_BUILDER_PASSPHRASE", ["POLYMARKET_BUILDER_PASSPHRASE"]);

if (appUrlValue) {
  try {
    const appUrl = new URL(appUrlValue);
    const isLocalHttp =
      appUrl.protocol === "http:" &&
      (appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1");

    if (appUrl.protocol !== "https:" && !isLocalHttp) {
      errors.push("NEXT_PUBLIC_APP_URL must use HTTPS outside local development");
    }

    if (
      appUrl.pathname !== "/" ||
      appUrl.search ||
      appUrl.hash ||
      appUrl.username ||
      appUrl.password
    ) {
      errors.push("NEXT_PUBLIC_APP_URL must contain only the deployment origin");
    }
  } catch {
    errors.push("NEXT_PUBLIC_APP_URL must be an absolute URL");
  }
}

const dbPort = Number(dbPortValue);
if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65_535) {
  errors.push("DB_PORT or MYSQLPORT must be an integer between 1 and 65535");
}

if (jwtSecret && Buffer.byteLength(jwtSecret, "utf8") < 32) {
  errors.push("JWT_SECRET must contain at least 32 bytes");
}

if (errors.length > 0) {
  fail(errors.join("\n- "));
}

console.log("deployment preflight ok: trading mode");
