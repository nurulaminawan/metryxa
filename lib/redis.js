import { createClient } from "redis";

function slot() {
  if (!globalThis.__metryxaRedis) {
    globalThis.__metryxaRedis = { url: "", client: null, connecting: null, retryAt: 0 };
  }
  return globalThis.__metryxaRedis;
}

export function redisUrl() {
  return process.env.REDIS_URL || "";
}

export async function getRedis() {
  const url = redisUrl();
  if (!url) return null;
  const state = slot();
  if (state.url !== url) {
    const previous = state.client;
    state.client = null;
    state.connecting = null;
    state.url = url;
    if (previous) previous.disconnect().catch(() => {});
  }
  if (state.client?.isOpen) return state.client;
  if (Date.now() < state.retryAt) return null;
  if (!state.connecting) {
    const client = createClient({
      url,
      RESP: 2,
      socket: { connectTimeout: 800, reconnectStrategy: () => false },
    });
    client.on("error", () => {});
    state.connecting = client
      .connect()
      .then(() => {
        state.client = client;
        state.connecting = null;
        state.retryAt = 0;
        return client;
      })
      .catch(() => {
        state.connecting = null;
        state.client = null;
        state.retryAt = Date.now() + 15_000;
        client.disconnect().catch(() => {});
        return null;
      });
  }
  return state.connecting;
}

export async function closeRedis() {
  const state = globalThis.__metryxaRedis;
  if (!state?.client) return;
  const client = state.client;
  state.client = null;
  state.connecting = null;
  if (client.isOpen) await client.quit().catch(() => {});
}
