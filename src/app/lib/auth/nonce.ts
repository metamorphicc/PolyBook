// Login nonces are single-use and short-lived. This TTL bounds how long an
// issued-but-unused nonce remains valid for verification, and is also the
// window after which getNonce prunes stale rows.
export const NONCE_TTL_SECONDS = 10 * 60; // 10 minutes
