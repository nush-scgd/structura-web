import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
app.get("/make-server-38a20121/health", (c) => {
  return c.json({ status: "ok" });
});

// KV Routes
const BASE_PATH = "/make-server-38a20121";

app.get(`${BASE_PATH}/kv/:key`, async (c) => {
  const key = c.req.param("key");
  try {
    const value = await kv.get(key);
    return c.json(value);
  } catch (e: any) {
    console.error("KV Get Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.post(`${BASE_PATH}/kv`, async (c) => {
  try {
    const { key, value } = await c.req.json();
    if (!key || value === undefined) {
      return c.json({ error: "Missing key or value" }, 400);
    }
    await kv.set(key, value);
    return c.json({ success: true });
  } catch (e: any) {
    console.error("KV Set Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.delete(`${BASE_PATH}/kv/:key`, async (c) => {
  const key = c.req.param("key");
  try {
    await kv.del(key);
    return c.json({ success: true });
  } catch (e: any) {
    console.error("KV Delete Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.get(`${BASE_PATH}/kv/prefix/:prefix`, async (c) => {
  const prefix = c.req.param("prefix");
  try {
    const values = await kv.getByPrefix(prefix);
    return c.json(values);
  } catch (e: any) {
    console.error("KV Prefix Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

Deno.serve(app.fetch);
