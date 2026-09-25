import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3002").replace(
  /\/$/,
  "",
);
const routes = ["/", "/terminal"];
const startsLocalServer = !process.env.SMOKE_BASE_URL;
let server;

if (startsLocalServer) {
  const nextCli = fileURLToPath(
    new URL("../node_modules/next/dist/bin/next", import.meta.url),
  );
  server = spawn(process.execPath, [nextCli, "start", "-p", "3002"], {
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
} finally {
  if (server && !server.killed) server.kill();
}
