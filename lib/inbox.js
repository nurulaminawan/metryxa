import fs from "fs";
import path from "path";
import { getRedis } from "./redis.js";

const file = path.join(process.cwd(), "data", "contacts.json");

export async function saveContact(entry) {
  const redis = await getRedis();
  if (redis) {
    await redis.lPush("metryxa:inbox", JSON.stringify(entry));
    await redis.lTrim("metryxa:inbox", 0, 199);
    return "redis";
  }
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    current.unshift(entry);
    fs.writeFileSync(file, JSON.stringify(current.slice(0, 200)));
    return "file";
  } catch {
    return "";
  }
}

export async function saveAiEvent(projectId, event) {
  const redis = await getRedis();
  if (!redis || !projectId) return false;
  const key = `metryxa:ai:${projectId}`;
  await redis.lPush(key, JSON.stringify(event));
  await redis.lTrim(key, 0, 499);
  return true;
}

export async function readAiEvents(projectId) {
  const redis = await getRedis();
  if (!redis || !projectId) return [];
  const rows = await redis.lRange(`metryxa:ai:${projectId}`, 0, 499);
  return rows.map((row) => {
    try {
      return JSON.parse(row);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
