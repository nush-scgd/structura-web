// src/lib/db.ts
import { supabase } from "./supabase";

/**
 * DB access layer (batteries included).
 * Many parts of the app call db.* directly, so we keep names stable.
 *
 * Tables:
 * - app_settings: key/value jsonb store (key text, value jsonb)
 * - booking_settings: single-row settings table (NO key column)
 */

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

type KVRow = { key: string; value: Json };

export type BookingSettings = {
  globalRedirectActive: boolean;
  bookingProvider: string; // e.g. "booksy"
  bookingUrl: string;
  defaultCtaLabel: string;
  openInNewTab: boolean;
};

export type PlatformSettings = {
  shopEnabled?: boolean;
  checkoutEnabled?: boolean;
  [k: string]: Json | undefined;
};

export type TenantSettings = {
  defaultCurrency?: string; // e.g. "ZAR"
  paymentProvider?: string;
  bookingProvider?: string;
  bookingUrl?: string;
  [k: string]: Json | undefined;
};

export type Service = {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  currency: string;
  priceMinor: number;
  durationMinutes: number;
  imageUrl?: string;
  stylistId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  // optional advanced pricing fields (present in your schema but not always used)
  pricingModel?: string;
  price?: number | null;
  fromPrice?: number | null;
  tiers?: any;
  duration?: string;
  images?: any;
  status?: string;
};


export type Stylist = {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  price?: number | null;
  currency?: string;
  duration?: string;
  status?: string;
  is_active?: boolean;
  images?: string[];
  thumbnail?: string | null;

  // NEW: stored in DB as `learning_outcomes` (text[])
  learningOutcomes?: string[];
};

const TABLES = {
  appSettings: "app_settings",
  bookingSettings: "booking_settings",
  courses: "courses",
  services: "services",
  stylists: "stylists",
  products: "products",
  instructors: "instructors",
  profiles: "profiles",
  students: "students",
  enrollments: "enrollments",
} as const;

const STORAGE = {
  courseImages: "course-images",
} as const;

function normalizeString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

function normalizeBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function normalizeNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function normalizeIdOrThrow(id: unknown, label = "id"): string {
  const s = normalizeString(id).trim();
  if (!s || s === "[object Object]") {
    throw new Error(`Invalid ${label}. Expected string/uuid, got: ${String(id)}`);
  }
  return s;
}

/**
 * app_settings (key/value jsonb) helpers
 */
async function getSettingsRow(table: string, key: string): Promise<KVRow | null> {
  const res = await supabase.from(table).select("key,value").eq("key", key).maybeSingle();

  if (res.error) {
    console.error(`getSettingsRow(${table}, ${key}) error:`, res.error);
    throw new Error(res.error.message);
  }
  return (res.data as KVRow) ?? null;
}

async function upsertSettingsRow(table: string, key: string, value: Json): Promise<void> {
  const payload: KVRow = { key, value };
  const res = await supabase.from(table).upsert(payload, { onConflict: "key" });

  if (res.error) {
    const msg = (res.error.message || "").toLowerCase();

    // Public pages often run without an auth session; RLS blocks writes.
    // Do not crash the whole app for best-effort seeding.
    if (
      msg.includes("row-level security") ||
      msg.includes("permission") ||
      msg.includes("not authorized")
    ) {
      console.warn(`upsertSettingsRow skipped due to RLS (${table}:${key})`, res.error);
      return;
    }

    console.error(`upsertSettingsRow(${table}, ${key}) error:`, res.error);
    throw new Error(res.error.message);
  }
}

/**
 * Legacy kv API (stored inside app_settings with key prefix "kv:")
 */
export const kv = {
  async get<T = Json>(key: string): Promise<T | null> {
    const row = await getSettingsRow(TABLES.appSettings, `kv:${key}`);
    return (row?.value as T) ?? null;
  },
  async set(key: string, value: Json): Promise<void> {
    await upsertSettingsRow(TABLES.appSettings, `kv:${key}`, value);
  },
  async remove(key: string): Promise<void> {
    const res = await supabase.from(TABLES.appSettings).delete().eq("key", `kv:${key}`);
    if (res.error) {
      console.error(`kv.remove(${key}) error:`, res.error);
      throw new Error(res.error.message);
    }
  },
};

/**
 * booking_settings (single-row table) helpers
 *
 * Expected columns (snake_case):
 * - id (integer)
 * - global_redirect_active (boolean)
 * - booking_provider (text)
 * - booking_url (text)
 * - default_cta_label (text)
 * - open_in_new_tab (boolean)
 *
 * If your column names differ, tell me what they are and I’ll map them.
 */
type BookingSettingsRow = {
  id: number;
  global_redirect_active: boolean | null;
  booking_provider: string | null;
  booking_url: string | null;
  default_cta_label: string | null;
  open_in_new_tab: boolean | null;
};

const BOOKING_FALLBACK: BookingSettings = {
  globalRedirectActive: true,
  bookingProvider: "booksy",
  bookingUrl: "https://structurahair.booksy.com",
  defaultCtaLabel: "Book Now",
  openInNewTab: true,
};

async function getBookingSettingsInternal(): Promise<BookingSettings> {
  const res = await supabase
    .from(TABLES.bookingSettings)
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  // If table exists but empty, return fallback
  if (res.error) {
    console.error("getBookingSettings error:", res.error);
    // Don’t crash the whole UI for booking settings; return fallback
    return BOOKING_FALLBACK;
  }

  const row = res.data as BookingSettingsRow | null;
  if (!row) return BOOKING_FALLBACK;

  return {
    globalRedirectActive: normalizeBool(row.global_redirect_active, BOOKING_FALLBACK.globalRedirectActive),
    bookingProvider: normalizeString(row.booking_provider, BOOKING_FALLBACK.bookingProvider),
    bookingUrl: normalizeString(row.booking_url, BOOKING_FALLBACK.bookingUrl),
    defaultCtaLabel: normalizeString(row.default_cta_label, BOOKING_FALLBACK.defaultCtaLabel),
    openInNewTab: normalizeBool(row.open_in_new_tab, BOOKING_FALLBACK.openInNewTab),
  };
}

async function saveBookingSettingsInternal(settings: BookingSettings): Promise<void> {
  // find existing row id (single-row strategy)
  const existing = await supabase
    .from(TABLES.bookingSettings)
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payload = {
    global_redirect_active: !!settings.globalRedirectActive,
    booking_provider: settings.bookingProvider,
    booking_url: settings.bookingUrl,
    default_cta_label: settings.defaultCtaLabel,
    open_in_new_tab: !!settings.openInNewTab,
  };

  if (existing.error) {
    console.error("saveBookingSettings lookup error:", existing.error);
    throw new Error(existing.error.message);
  }

  if (existing.data?.id != null) {
    const res = await supabase.from(TABLES.bookingSettings).update(payload).eq("id", existing.data.id);
    if (res.error) {
      console.error("saveBookingSettings update error:", res.error);
      throw new Error(res.error.message);
    }
    return;
  }

  const insertRes = await supabase.from(TABLES.bookingSettings).insert(payload);
  if (insertRes.error) {
    console.error("saveBookingSettings insert error:", insertRes.error);
    throw new Error(insertRes.error.message);
  }
}

/**
 * Platform settings stored in app_settings: key = "settings:platform", value = jsonb
 */
async function getPlatformSettingsInternal(): Promise<PlatformSettings> {
  const fallback: PlatformSettings = { shopEnabled: false, checkoutEnabled: false };
  const row = await getSettingsRow(TABLES.appSettings, "settings:platform");

  if (!row?.value || typeof row.value !== "object") return fallback;

  const v = row.value as Record<string, unknown>;
  return {
    ...fallback,
    ...v,
    shopEnabled: normalizeBool(v.shopEnabled, fallback.shopEnabled),
    checkoutEnabled: normalizeBool(v.checkoutEnabled, fallback.checkoutEnabled),
  };
}

async function savePlatformSettingsInternal(settings: PlatformSettings): Promise<void> {
  await upsertSettingsRow(TABLES.appSettings, "settings:platform", settings);
}

/**
 * Tenant settings stored in app_settings: key = "settings:tenant", value = jsonb
 */
async function getTenantSettingsInternal(): Promise<TenantSettings> {
  const row = await getSettingsRow(TABLES.appSettings, "settings:tenant");
  if (!row?.value || typeof row.value !== "object") return {};
  return row.value as TenantSettings;
}

async function saveTenantSettingsInternal(settings: TenantSettings): Promise<void> {
  await upsertSettingsRow(TABLES.appSettings, "settings:tenant", settings);
}

function mapServiceRow(s: any): Service {
  const currency = normalizeString(s?.currency, "ZAR");
  const priceMinor =
    s?.price_minor != null
      ? normalizeNumber(s.price_minor, 0)
      : Math.round(normalizeNumber(s?.price, 0) * 100);

  return {
    id: normalizeString(s?.id),
    name: normalizeString(s?.name),
    categoryId: normalizeString(s?.category_id ?? s?.category, "general"),
    description: s?.description ?? undefined,
    currency,
    priceMinor,
    durationMinutes: normalizeNumber(s?.duration_minutes, 60),
    imageUrl: s?.image_url ?? undefined,
    stylistId: s?.stylist_id ?? null,
    isActive: normalizeBool(s?.is_active, true),
    sortOrder: normalizeNumber(s?.sort_order, 0),
    createdAt: s?.created_at ?? undefined,
    pricingModel: s?.pricing_model ?? undefined,
    price: s?.price != null ? normalizeNumber(s.price, 0) : null,
    fromPrice: s?.from_price != null ? normalizeNumber(s.from_price, 0) : null,
    tiers: s?.tiers ?? undefined,
    duration: s?.duration ?? undefined,
    images: s?.images ?? undefined,
    status: s?.status ?? undefined,
  };
}

function mapStylistRow(s: any): Stylist {
  return {
    id: normalizeString(s?.id),
    name: normalizeString(s?.name),
    isActive: s?.is_active != null ? normalizeBool(s.is_active, true) : undefined,
    createdAt: s?.created_at ?? undefined,
  };
}

async function getStylistsInternal(): Promise<Stylist[]> {
  const res = await supabase
    .from(TABLES.stylists)
    .select("*")
    .order("name", { ascending: true });

  if (res.error) {
    console.error("getStylists error:", res.error);
    // Surface the real cause (often RLS / missing table)
    throw new Error(res.error.message);
  }

  const rows = (res.data ?? []).map(mapStylistRow);
  rows.sort((a, b) => normalizeString(a.name).localeCompare(normalizeString(b.name)));
  return rows;
}

/**
 * Data loaders (defensive)
 */
async function getCoursesInternal(): Promise<Course[]> {
  const res = await supabase.from(TABLES.courses).select("*").order("title", { ascending: true });
  if (res.error) {
    console.error("getCourses error:", res.error);
    return [];
  }
  return (res.data ?? []).map((c: any) => {
    const images = safeArray<string>(c?.images).filter((x) => typeof x === "string" && x.trim().length > 0);
    const thumbnail = c?.thumbnail ?? images?.[0] ?? null;

    const learningOutcomes = safeArray<string>(c?.learning_outcomes ?? c?.learning_outcomes ?? c?.learningOutcomes).filter(
      (x) => typeof x === "string" && x.trim().length > 0
    );

    return {
      ...c,
      id: normalizeString(c.id),
      title: normalizeString(c.title),
      description: normalizeString(c.description),
      images,
      thumbnail,
      learningOutcomes,
    };
  });
}

async function getCourseInternal(id: string): Promise<Course | null> {
  const courseId = normalizeIdOrThrow(id, "course id");
  const res = await supabase.from(TABLES.courses).select("*").eq("id", courseId).maybeSingle();

  if (res.error) {
    console.error("getCourse error:", res.error);
    return null;
  }

  if (!res.data) return null;

  const c: any = res.data;
  const images = safeArray<string>(c?.images).filter((x) => typeof x === "string" && x.trim().length > 0);
  const thumbnail = c?.thumbnail ?? images?.[0] ?? null;

  const learningOutcomes = safeArray<string>(c?.learning_outcomes ?? c?.learning_outcomes ?? c?.learningOutcomes).filter(
    (x) => typeof x === "string" && x.trim().length > 0
  );

  return {
    ...c,
    id: normalizeString(c.id),
    title: normalizeString(c.title),
    description: normalizeString(c.description),
    images,
    thumbnail,
    learningOutcomes,
  };
}

async function getServicesInternal(): Promise<Service[]> {
  const res = await supabase
    .from(TABLES.services)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (res.error) {
    console.error("getServices error:", res.error);
    // IMPORTANT: do not silently return [] — surface the real issue (often RLS)
    throw new Error(res.error.message);
  }

  const rows = (res.data ?? []).map(mapServiceRow);

  // safe sort (never crash on null/undefined)
  rows.sort((a, b) => normalizeString(a.name).localeCompare(normalizeString(b.name)));

  return rows;
}

async function getServiceInternal(id: string): Promise<Service | null> {
  const res = await supabase
    .from(TABLES.services)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (res.error) {
    console.error("getService error:", res.error);
    return null;
  }

  if (!res.data) return null;
  return mapServiceRow(res.data);
}

async function getProductsInternal(): Promise<any[]> {
  const res = await supabase.from(TABLES.products).select("*");
  if (res.error) {
    console.error("getProducts error:", res.error);
    return [];
  }
  return (res.data ?? []).map((p: any) => ({
    ...p,
    id: normalizeString(p.id),
    title: normalizeString(p.title ?? p.name),
    name: normalizeString(p.name ?? p.title),
    currency: normalizeString(p.currency),
    price_minor: p.price_minor ?? 0,
  }));
}

async function getInstructorsInternal(): Promise<any[]> {
  const res = await supabase.from(TABLES.instructors).select("*");
  if (!res.error) return res.data ?? [];

  // If the table/endpoint doesn't exist (PostgREST 404), just fall back quietly.
  const status = (res.error as any)?.status ?? (res.error as any)?.code;
  if (status === 404) {
    const fallback = await kv.get<any[]>("instructors");
    return safeArray<any>(fallback);
  }

  console.warn("getInstructors table read failed, trying app_settings fallback:", res.error);
  const fallback = await kv.get<any[]>("instructors");
  return safeArray<any>(fallback);
}

async function getProfileInternal(userId: string): Promise<any | null> {
  const res = await supabase.from(TABLES.profiles).select("*").eq("id", userId).maybeSingle();
  if (res.error) {
    console.error("getProfile error:", res.error);
    return null;
  }
  return res.data ?? null;
}

/**
 * KPI summary (defensive, never crash dashboard)
 */
async function getKPISummaryInternal(): Promise<Record<string, any>> {
  const safeCount = async (table: string): Promise<number> => {
    const res = await supabase.from(table).select("*", { count: "exact", head: true });
    if (res.error) return 0;
    return res.count ?? 0;
  };

  const [courses, services, products, students, enrollments] = await Promise.all([
    safeCount(TABLES.courses),
    safeCount(TABLES.services),
    safeCount(TABLES.products),
    safeCount(TABLES.students),
    safeCount(TABLES.enrollments),
  ]);

  return {
    courses: { value: courses },
    services: { value: services },
    products: { value: products },
    students: { value: students },
    enrollments: { value: enrollments },
  };
}

/**
 * Seed: ensure required settings rows exist (and booking_settings has 1 row)
 */
async function seedIfNeededInternal(): Promise<void> {
  // platform
  const platform = await getSettingsRow(TABLES.appSettings, "settings:platform");
  if (!platform) {
    try {
      await upsertSettingsRow(TABLES.appSettings, "settings:platform", {
        shopEnabled: false,
        checkoutEnabled: false,
      });
    } catch (e) {
      console.warn("seedIfNeededInternal: settings:platform seed skipped", e);
    }
  }

  // tenant (optional but useful)
  const tenant = await getSettingsRow(TABLES.appSettings, "settings:tenant");
  if (!tenant) {
    try {
      await upsertSettingsRow(TABLES.appSettings, "settings:tenant", {
        defaultCurrency: "ZAR",
      });
    } catch (e) {
      console.warn("seedIfNeededInternal: settings:tenant seed skipped", e);
    }
  }

  // booking_settings row
  const booking = await supabase
    .from(TABLES.bookingSettings)
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!booking.error && !booking.data) {
    await supabase.from(TABLES.bookingSettings).insert({
      global_redirect_active: BOOKING_FALLBACK.globalRedirectActive,
      booking_provider: BOOKING_FALLBACK.bookingProvider,
      booking_url: BOOKING_FALLBACK.bookingUrl,
      default_cta_label: BOOKING_FALLBACK.defaultCtaLabel,
      open_in_new_tab: BOOKING_FALLBACK.openInNewTab,
    });
  }
}

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}

type UploadPublicResult = {
  path: string;
  publicUrl: string;
};

async function uploadCourseImageInternal(
  file: File,
  opts?: { courseId?: string; folder?: string }
): Promise<UploadPublicResult> {
  const folder = sanitizeFileName(opts?.folder ?? "courses");
  const courseId = sanitizeFileName(opts?.courseId ?? "misc");

  const original = sanitizeFileName(file.name || "image");
  const ext = original.includes(".") ? original.split(".").pop() : "jpg";
  const safeExt = sanitizeFileName(ext || "jpg") || "jpg";

  const fileNameBase = original.replace(/\.[^/.]+$/, "") || "image";
  const fileName = `${sanitizeFileName(fileNameBase)}-${Date.now()}.${safeExt}`;

  const path = `${folder}/${courseId}/${fileName}`;

  const uploadRes = await supabase.storage
    .from(STORAGE.courseImages)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadRes.error) {
    console.error("uploadCourseImage error:", uploadRes.error);
    throw new Error(uploadRes.error.message);
  }

  const publicRes = supabase.storage.from(STORAGE.courseImages).getPublicUrl(path);
  const publicUrl = publicRes?.data?.publicUrl;

  if (!publicUrl) {
    throw new Error("Could not generate public URL for uploaded image.");
  }

  return { path, publicUrl };
}

async function deleteCourseImageInternal(path: string): Promise<void> {
  const res = await supabase.storage.from(STORAGE.courseImages).remove([path]);
  if (res.error) {
    console.error("deleteCourseImage error:", res.error);
    throw new Error(res.error.message);
  }
}

/**
 * CRUD helpers (so admin pages can create/manage rows)
 */
async function createServiceInternal(input: any): Promise<Service> {
  const res = await supabase.from(TABLES.services).insert(input).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return mapServiceRow(res.data);
}
async function updateServiceInternal(id: string, patch: any): Promise<Service> {
  const serviceId = normalizeIdOrThrow(id, "service id");
  const res = await supabase.from(TABLES.services).update(patch).eq("id", serviceId).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return mapServiceRow(res.data);
}
async function deleteServiceInternal(id: string): Promise<void> {
  const serviceId = normalizeIdOrThrow(id, "service id");
  const res = await supabase.from(TABLES.services).delete().eq("id", serviceId);
  if (res.error) throw new Error(res.error.message);
}

async function createCourseInternal(input: any): Promise<any> {
  const res = await supabase.from(TABLES.courses).insert(input).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
async function updateCourseInternal(id: string, patch: any): Promise<any> {
  const courseId = normalizeIdOrThrow(id, "course id");
  const res = await supabase.from(TABLES.courses).update(patch).eq("id", courseId).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
async function deleteCourseInternal(id: string): Promise<void> {
  const courseId = normalizeIdOrThrow(id, "course id");
  const res = await supabase.from(TABLES.courses).delete().eq("id", courseId);
  if (res.error) throw new Error(res.error.message);
}

async function createProductInternal(input: any): Promise<any> {
  const res = await supabase.from(TABLES.products).insert(input).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
async function updateProductInternal(id: string, patch: any): Promise<any> {
  const productId = normalizeIdOrThrow(id, "product id");
  const res = await supabase.from(TABLES.products).update(patch).eq("id", productId).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
async function deleteProductInternal(id: string): Promise<void> {
  const productId = normalizeIdOrThrow(id, "product id");
  const res = await supabase.from(TABLES.products).delete().eq("id", productId);
  if (res.error) throw new Error(res.error.message);
}

/**
 * Public API (names stable)
 */
export const db = {
  // settings
  getPlatformSettings: getPlatformSettingsInternal,
  savePlatformSettings: savePlatformSettingsInternal,

  getTenantSettings: getTenantSettingsInternal,
  saveTenantSettings: saveTenantSettingsInternal,

  getBookingSettings: getBookingSettingsInternal,
  saveBookingSettings: saveBookingSettingsInternal,

  // bootstrap
  seedIfNeeded: seedIfNeededInternal,

  // data
  getCourses: getCoursesInternal,
  getCourse: getCourseInternal,
  getServices: getServicesInternal,
  getStylists: getStylistsInternal,
  getService: getServiceInternal,
  getProducts: getProductsInternal,
  getInstructors: getInstructorsInternal,

  // CRUD
  createService: createServiceInternal,
  updateService: updateServiceInternal,
  deleteService: deleteServiceInternal,

  createCourse: createCourseInternal,
  updateCourse: updateCourseInternal,
  deleteCourse: deleteCourseInternal,

  createProduct: createProductInternal,
  updateProduct: updateProductInternal,
  deleteProduct: deleteProductInternal,

  // storage
  uploadCourseImage: uploadCourseImageInternal,
  deleteCourseImage: deleteCourseImageInternal,

  // auth/profile
  getProfile: getProfileInternal,

  // dashboard
  getKPISummary: getKPISummaryInternal,
};

export default db;