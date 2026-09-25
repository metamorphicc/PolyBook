import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const routes = ["/", "/terminal"];
const startsLocalServer = !process.env.SMOKE_BASE_URL;
const expectedMode = process.env.SMOKE_EXPECT_MODE ?? "portfolio";
let server;

async function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;
      probe.close(() => (port ? resolve(port) : reject(new Error("No port"))));
    });
  });
}

const localPort = startsLocalServer
  ? Number(process.env.SMOKE_PORT) || (await availablePort())
  : null;
const baseUrl = (
  process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${localPort}`
).replace(/\/$/, "");

if (startsLocalServer) {
  const nextCli = fileURLToPath(
    new URL("../node_modules/next/dist/bin/next", import.meta.url),
  );
  server = spawn(process.execPath, [nextCli, "start", "-p", String(localPort)], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.pipe(process.stdout);
  server.stderr.pipe(process.stderr);
}

async function waitUntilReady() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`, { redirect: "follow" });
      if (response.ok) return;
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

try {
  if (startsLocalServer) await waitUntilReady();

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    const response = await fetch(url, { redirect: "follow" });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }

    if (!body.includes("PolyBook")) {
      throw new Error(`${url} did not render the PolyBook application`);
    }

    console.log(`ok ${response.status} ${url}`);
  }

  if (expectedMode === "portfolio") {
    const privateChecks = [
      fetch(`${baseUrl}/profile`, { redirect: "manual" }),
      fetch(`${baseUrl}/api/session`, { redirect: "manual" }),
      fetch(`${baseUrl}/api/user/trading-wallet`, { redirect: "manual" }),
      fetch(`${baseUrl}/api/getNonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: "0x0000000000000000000000000000000000000000" }),
        redirect: "manual",
      }),
      fetch(`${baseUrl}/api/polymarket-builder-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        redirect: "manual",
      }),
      fetch(`${baseUrl}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        redirect: "manual",
      }),
    ];

    for (const responsePromise of privateChecks) {
      const response = await responsePromise;
      if (response.status !== 404) {
        throw new Error(
          `${response.url} returned ${response.status}; expected portfolio isolation (404)`,
        );
      }
      console.log(`ok 404 ${response.url}`);
    }
  }
} finally {
  if (server && !server.killed) server.kill();
}
