import {
  alignTimestampToWindow,
  getPolymarketServerTime,
  makeUpdownSlugCandidates,
  timeframeToStepSeconds,
  type Asset,
  type Timeframe,
} from "./time";
import { getMarketBySlug, marketEndTimestamp } from "./markets";

// The terminal polls the book twice a second per open ladder and the rail every
// few seconds. Resolving a market from scratch each time would mean a /time call
// plus up to two gamma lookups before any real data, so both are cached here:
// the clock as an offset from the local clock, the market for its whole window.
const SERVER_TIME_REFRESH_MS = 60_000;

let serverTimeOffsetSec = 0;
let serverTimeSyncedAtMs = 0;
let serverTimeSyncInFlight: Promise<void> | null = null;

export type ResolvedFastMarket = {
  slug: string;
  marketId: string;
  conditionId: string;
  tokenId: string;
  tokenIds: string[];
  outcomes: string[];
  /** Unix seconds when this market resolves. */
  endTs: number;
};

const marketCache = new Map<string, ResolvedFastMarket>();
const inFlight = new Map<string, Promise<ResolvedFastMarket | null>>();

/**
 * Polymarket's clock, derived from a cached offset against the local clock.
 * Only the very first call blocks on the network; later refreshes happen in the
 * background so a slow /time call never stalls a book tick.
 */
export async function currentServerTime(): Promise<number> {
  const isStale = Date.now() - serverTimeSyncedAtMs > SERVER_TIME_REFRESH_MS;

  if (isStale && !serverTimeSyncInFlight) {
    serverTimeSyncInFlight = (async () => {
      try {
        const serverTs = await getPolymarketServerTime();
        serverTimeOffsetSec = serverTs - Math.floor(Date.now() / 1000);
        serverTimeSyncedAtMs = Date.now();
      } catch (e) {
        console.warn("[fastMarket] server time sync failed:", e);
      } finally {
        serverTimeSyncInFlight = null;
      }
    })();
  }

  if (serverTimeSyncedAtMs === 0 && serverTimeSyncInFlight) {
    await serverTimeSyncInFlight;
  }

  return Math.floor(Date.now() / 1000) + serverTimeOffsetSec;
}

function pruneMarketCache(cutoffTs: number) {
  for (const [key, value] of marketCache) {
    if (value.endTs > 0 && value.endTs < cutoffTs) {
      marketCache.delete(key);
    }
  }
}

async function resolveUncached(
  asset: Asset,
  timeframe: Timeframe,
  alignedTs: number,
  cacheKey: string,
): Promise<ResolvedFastMarket | null> {
  const step = timeframeToStepSeconds(timeframe);
  const slugs = makeUpdownSlugCandidates(asset, timeframe, alignedTs);

  for (const [index, slug] of slugs.entries()) {
    try {
      const result = await getMarketBySlug(slug);
      // Candidates are [alignedTs, alignedTs - step]; the matched index says
      // which window the slug belongs to, so the computed fallback end time is
      // right even when the previous window is still the live market.
      const candidateTs = alignedTs - index * step;
      const resolved: ResolvedFastMarket = {
        slug,
        marketId: result.marketId,
        conditionId: result.conditionId ?? "",
        tokenId: String(result.tokenId),
        tokenIds: result.tokenIds.map(String),
        outcomes: result.outcomes,
        endTs: marketEndTimestamp(result.market) ?? candidateTs + step,
      };

      marketCache.set(cacheKey, resolved);
      pruneMarketCache(alignedTs - step * 2);

      return resolved;
    } catch (e) {
      console.warn("[fastMarket] slug miss:", slug, e);
    }
  }

  return null;
}

/**
 * The live fast market for an asset/timeframe, cached for the window's lifetime.
 * Concurrent callers for the same window share one gamma lookup.
 */
export async function resolveFastMarket(
  asset: Asset,
  timeframe: Timeframe,
  serverTs: number,
): Promise<ResolvedFastMarket | null> {
  const alignedTs = alignTimestampToWindow(serverTs, timeframe);
  const cacheKey = `${asset}:${timeframe}:${alignedTs}`;

  const cached = marketCache.get(cacheKey);
  if (cached) return cached;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const request = resolveUncached(asset, timeframe, alignedTs, cacheKey).finally(
    () => inFlight.delete(cacheKey),
  );
  inFlight.set(cacheKey, request);

  return request;
}

export function fastMarketSlugCandidates(
  asset: Asset,
  timeframe: Timeframe,
  serverTs: number,
) {
  return makeUpdownSlugCandidates(
    asset,
    timeframe,
    alignTimestampToWindow(serverTs, timeframe),
  );
}
