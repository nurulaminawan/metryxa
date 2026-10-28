import { getRedis, redisUrl } from "./redis.js";

const buckets = new Map();
const MAX_KEYS = 2000;
const MAX_WINDOW_MS = 10 * 60 * 1000;

export function clientAddress(request) {
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip.slice(0, 80);
  }
  return "local";
}

export function slidingWindow(key, limit, windowMs, now = Date.now()) {
  const hits = (buckets.get(key) || []).filter((ts) => now - ts < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfter, store: "memory" };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) {
    for (const [storedKey, storedHits] of buckets) {
      const newest = storedHits[storedHits.length - 1] || 0;
      if (now - newest > MAX_WINDOW_MS) buckets.delete(storedKey);
    }
  }
  return { ok: true, remaining: limit - hits.length, retryAfter: 0, store: "memory" };
}

export const POLICIES = {
  read: { limit: 120, windowMs: 60 * 1000, message: "Too many page loads." },
  crawl: { limit: 8, windowMs: 10 * 60 * 1000, message: "Crawl limit reached." },
  write: { limit: 40, windowMs: 60 * 1000, message: "Too many updates." },
  captcha: { limit: 20, windowMs: 60 * 1000, message: "Too many human-check attempts." },
  beacon: { limit: 60, windowMs: 60 * 1000, message: "Too many visit beacons from this address." },
};

const SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = 1
  if oldest[2] ~= nil then
    retry = math.ceil((tonumber(oldest[2]) + window - now) / 1000)
    if retry < 1 then retry = 1 end
  end
  return {0, 0, retry}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, limit - count - 1, 0}
`;

function fromRedis(raw) {
  const row = Array.isArray(raw) ? raw : [];
  const ok = Number(row[0]) === 1;
  return {
    ok,
    remaining: Number(row[1]) || 0,
    retryAfter: ok ? 0 : Math.max(1, Number(row[2]) || 1),
    store: "redis",
  };
}

export async function reserveWindow(key, limit, windowMs, now = Date.now()) {
  const client = await getRedis();
  if (client) {
    try {
      const raw = await client.eval(SLIDING_WINDOW, {
        keys: [`metryxa:rl:${key}`],
        arguments: [String(now), String(windowMs), String(limit), `${now}:${Math.random().toString(36).slice(2)}`],
      });
      return fromRedis(raw);
    } catch {
      /* Redis dropped mid-command. This request uses the process window. */
    }
  }
  return slidingWindow(key, limit, windowMs, now);
}

export async function limitStore() {
  if (!redisUrl()) return "memory";
  const client = await getRedis();
  return client ? "redis" : "memory";
}

export async function enforceRateLimit(request, bucket, extraHeaders = {}) {
  const policy = POLICIES[bucket];
  const result = await reserveWindow(`${bucket}:${clientAddress(request)}`, policy.limit, policy.windowMs);
  if (result.ok) return null;
  return Response.json(
    {
      error: `${policy.message} Try again in ${result.retryAfter}s.`,
      retryAfterSeconds: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        ...extraHeaders,
        "retry-after": String(result.retryAfter),
        "x-ratelimit-limit": String(policy.limit),
        "x-ratelimit-remaining": "0",
      },
    }
  );
}
