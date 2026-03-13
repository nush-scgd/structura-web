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

export type Instructor = {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  links?: any;
  isActive?: boolean;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CourseSession = {
  id: string;
  courseId: string;
  instructorId: string | null;
  title: string;
  intakeLabel?: string | null;
  status: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  capacity: number;
  enrolledCount: number;
  location?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Profile = {
  id: string;
  role: string;
  email: string;
  status: string;
  fullName?: string;
  createdAt?: string;
};

export type AcademyEnrollment = {
  id: string;
  studentId?: string | null;
  courseId: string;
  sessionId?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  currency: string;
  enrolledAt?: string;
  invoiceSentAt?: string | null;
  paymentConfirmedAt?: string | null;
  notes?: string | null;
  proofOfPaymentUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const TABLES = {
  appSettings: "app_settings",
  bookingSettings: "booking_settings",
  courses: "courses",
  courseSessions: "course_sessions",
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
  const candidate =
    typeof id === "object" && id !== null && "id" in (id as Record<string, unknown>)
      ? (id as Record<string, unknown>).id
      : id;

  const s = normalizeString(candidate).trim();
  if (!s || s === "[object Object]") {
    throw new Error(`Invalid ${label}. Expected string/uuid, got: ${String(id)}`);
  }
  return s;
}

function isUuid(v: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeString(v));
}

function makeUuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000';
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

function mapInstructorRow(i: any): Instructor {
  return {
    id: normalizeString(i?.id),
    name: normalizeString(i?.name),
    title: i?.title ?? undefined,
    bio: i?.bio ?? undefined,
    avatarUrl: i?.avatar_url ?? undefined,
    links: i?.links ?? undefined,
    isActive: i?.is_active != null ? normalizeBool(i.is_active, true) : undefined,
    tenantId: i?.tenant_id ?? null,
    createdAt: i?.created_at ?? undefined,
    updatedAt: i?.updated_at ?? undefined,
  };
}

function mapCourseSessionRow(s: any): CourseSession {
  return {
    id: normalizeString(s?.id),
    courseId: normalizeString(s?.course_id),
    instructorId: s?.instructor_id ?? null,
    title: normalizeString(s?.title),
    intakeLabel: s?.intake_label ?? null,
    status: normalizeString(s?.status, "scheduled"),
    startDate: normalizeString(s?.start_date),
    endDate: normalizeString(s?.end_date),
    startTime: s?.start_time ?? null,
    endTime: s?.end_time ?? null,
    capacity: normalizeNumber(s?.capacity, 0),
    enrolledCount: normalizeNumber(s?.enrolled_count, 0),
    location: s?.location ?? null,
    notes: s?.notes ?? null,
    isActive: normalizeBool(s?.is_active, true),
    createdAt: s?.created_at ?? undefined,
    updatedAt: s?.updated_at ?? undefined,
  };
}

function mapProfileRow(p: any): Profile {
  return {
    id: normalizeString(p?.id),
    role: normalizeString(p?.role, 'student'),
    email: normalizeString(p?.email),
    status: normalizeString(p?.status, 'lead'),
    fullName: p?.full_name ?? undefined,
    createdAt: p?.created_at ?? undefined,
  };
}

function mapAcademyEnrollmentRow(e: any): AcademyEnrollment {
  return {
    id: normalizeString(e?.id),
    studentId: e?.student_id ?? null,
    courseId: normalizeString(e?.course_id),
    sessionId: e?.session_id ?? null,
    studentName: e?.student_name ?? null,
    studentEmail: e?.student_email ?? null,
    status: normalizeString(e?.status, 'requested'),
    paymentStatus: normalizeString(e?.payment_status, 'pending'),
    amountPaid: normalizeNumber(e?.amount_paid, 0),
    currency: normalizeString(e?.currency, 'ZAR'),
    enrolledAt: e?.enrolled_at ?? undefined,
    invoiceSentAt: e?.invoice_sent_at ?? null,
    paymentConfirmedAt: e?.payment_confirmed_at ?? null,
    notes: e?.notes ?? null,
    proofOfPaymentUrl: e?.proof_of_payment_url ?? null,
    createdAt: e?.created_at ?? undefined,
    updatedAt: e?.updated_at ?? undefined,
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

async function getInstructorsInternal(): Promise<Instructor[]> {
  const res = await supabase.from(TABLES.instructors).select("*").order("name", { ascending: true });
  if (!res.error) return (res.data ?? []).map(mapInstructorRow);

  const status = (res.error as any)?.status ?? (res.error as any)?.code;
  if (status === 404) {
    const fallback = await kv.get<any[]>("instructors");
    return safeArray<any>(fallback).map(mapInstructorRow);
  }

  console.warn("getInstructors table read failed, trying app_settings fallback:", res.error);
  const fallback = await kv.get<any[]>("instructors");
  return safeArray<any>(fallback).map(mapInstructorRow);
}

async function getCourseSessionsInternal(courseId?: string): Promise<CourseSession[]> {
  let query = supabase
    .from(TABLES.courseSessions)
    .select("*")
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (courseId) {
    query = query.eq("course_id", normalizeIdOrThrow(courseId, "course id"));
  }

  const res = await query;
  if (res.error) {
    console.error("getCourseSessions error:", res.error);
    throw new Error(res.error.message);
  }

  return (res.data ?? []).map(mapCourseSessionRow);
}

async function getCourseSessionInternal(id: string): Promise<CourseSession | null> {
  const sessionId = normalizeIdOrThrow(id, "course session id");
  const res = await supabase
    .from(TABLES.courseSessions)
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (res.error) {
    console.error("getCourseSession error:", res.error);
    throw new Error(res.error.message);
  }

  if (!res.data) return null;
  return mapCourseSessionRow(res.data);
}

async function createCourseSessionInternal(input: any): Promise<CourseSession> {
  const res = await supabase
    .from(TABLES.courseSessions)
    .insert(input)
    .select("*")
    .single();

  if (res.error) throw new Error(res.error.message);
  return mapCourseSessionRow(res.data);
}

async function updateCourseSessionInternal(id: string, patch: any): Promise<CourseSession> {
  const sessionId = normalizeIdOrThrow(id, "course session id");
  const res = await supabase
    .from(TABLES.courseSessions)
    .update(patch)
    .eq("id", sessionId)
    .select("*")
    .single();

  if (res.error) throw new Error(res.error.message);
  return mapCourseSessionRow(res.data);
}

async function deleteCourseSessionInternal(id: string): Promise<void> {
  const sessionId = normalizeIdOrThrow(id, "course session id");
  const res = await supabase.from(TABLES.courseSessions).delete().eq("id", sessionId);
  if (res.error) throw new Error(res.error.message);
}

async function getProfileInternal(userId: string): Promise<Profile | null> {
  const id = normalizeString(userId).trim();
  if (!id) return null;

  const res = await supabase.from(TABLES.profiles).select('*').eq('id', id).maybeSingle();
  if (res.error) {
    console.error('getProfile error:', res.error);
    return null;
  }
  return res.data ? mapProfileRow(res.data) : null;
}

async function getProfileByEmailInternal(email: string): Promise<Profile | null> {
  const normalizedEmail = normalizeString(email).trim().toLowerCase();
  if (!normalizedEmail) return null;

  const res = await supabase
    .from(TABLES.profiles)
    .select('*')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (res.error) {
    console.error('getProfileByEmail error:', res.error);
    return null;
  }

  return res.data ? mapProfileRow(res.data) : null;
}

async function saveProfileInternal(input: any): Promise<Profile> {
  const normalizedEmail = normalizeString(input?.email).trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email is required');

  const existingByEmail = await getProfileByEmailInternal(normalizedEmail);
  const profileId = existingByEmail?.id ?? (isUuid(input?.id) ? normalizeString(input.id) : makeUuid());

  const payload = {
    id: profileId,
    role: normalizeString(input?.role, existingByEmail?.role ?? 'student'),
    email: normalizedEmail,
    status: normalizeString(input?.status, existingByEmail?.status ?? 'lead'),
    full_name: normalizeString(input?.fullName ?? input?.full_name, existingByEmail?.fullName ?? ''),
    created_at: input?.createdAt ?? input?.created_at ?? existingByEmail?.createdAt ?? new Date().toISOString(),
  };

  const res = await supabase
    .from(TABLES.profiles)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (res.error) {
    console.error('saveProfile error:', res.error);
    throw new Error(res.error.message);
  }

  return mapProfileRow(res.data);
}


async function getAcademyEnrollmentsInternal(): Promise<AcademyEnrollment[]> {
  const res = await supabase
    .from(TABLES.enrollments)
    .select('*')
    .order('created_at', { ascending: false });

  if (res.error) {
    console.error('getAcademyEnrollments error:', res.error);
    throw new Error(res.error.message);
  }

  return (res.data ?? []).map(mapAcademyEnrollmentRow);
}

async function getEnrollmentsReportInternal(start: Date | string, end: Date | string): Promise<{
  list: any[];
  daily: Array<{ date: string; enrollments: number; completions: number }>;
  summary: {
    totalEnrollments: number;
    completions: number;
    completionRate: number;
    enrollmentsChange: number;
    completionsChange: number;
    rateChange: number;
  };
}> {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
  const periodMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 24 * 60 * 60 * 1000);
  const prevStart = new Date(rangeStart.getTime() - periodMs);
  const prevEnd = new Date(rangeStart.getTime());

  const [enrollmentsRes, coursesRes] = await Promise.all([
    supabase
      .from(TABLES.enrollments)
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from(TABLES.courses)
      .select('id,title')
  ]);

  if (enrollmentsRes.error) {
    console.error('getEnrollmentsReport enrollments error:', enrollmentsRes.error);
    throw new Error(enrollmentsRes.error.message);
  }

  if (coursesRes.error) {
    console.error('getEnrollmentsReport courses lookup error:', coursesRes.error);
    throw new Error(coursesRes.error.message);
  }

  const courseTitleMap = new Map<string, string>(
    (coursesRes.data ?? []).map((course: any) => [
      normalizeString(course.id),
      normalizeString(course.title, 'Untitled Course')
    ])
  );

  const getEffectiveDate = (row: any): Date | null => {
    const raw = row?.enrolled_at ?? row?.created_at ?? null;
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isInRange = (date: Date | null, startValue: Date, endValue: Date) => {
    if (!date) return false;
    const time = date.getTime();
    return time >= startValue.getTime() && time < endValue.getTime();
  };

  const allRows = (enrollmentsRes.data ?? []).map((row: any) => {
    const mapped = mapAcademyEnrollmentRow(row);
    const effectiveDate = getEffectiveDate(row);
    return {
      ...mapped,
      enrolledAt: mapped.enrolledAt ?? mapped.createdAt ?? row?.created_at ?? null,
      createdAt: mapped.createdAt ?? row?.created_at ?? null,
      courseTitle: courseTitleMap.get(normalizeString(mapped.courseId)) ?? 'Untitled Course',
      studentName: mapped.studentName ?? mapped.studentEmail ?? 'Student',
      _effectiveDate: effectiveDate,
    };
  });

  const currentRows = allRows.filter((row: any) => isInRange(row._effectiveDate, rangeStart, rangeEnd));
  const previousRows = allRows.filter((row: any) => isInRange(row._effectiveDate, prevStart, prevEnd));

  const dailyMap = new Map<string, { date: string; enrollments: number; completions: number }>();

  for (let cursor = new Date(rangeStart); cursor < rangeEnd; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    const bucket = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).toISOString();
    dailyMap.set(bucket, { date: bucket, enrollments: 0, completions: 0 });
  }

  currentRows.forEach((row: any) => {
    const sourceDate = row._effectiveDate as Date | null;
    if (!sourceDate) return;

    const bucket = new Date(sourceDate.getFullYear(), sourceDate.getMonth(), sourceDate.getDate()).toISOString();
    const existing = dailyMap.get(bucket) ?? { date: bucket, enrollments: 0, completions: 0 };
    existing.enrollments += 1;

    const status = normalizeString(row.status).toLowerCase();
    if (status === 'completed' || status === 'passed') {
      existing.completions += 1;
    }

    dailyMap.set(bucket, existing);
  });

  const countCompletions = (rows: any[]) =>
    rows.filter((row: any) => {
      const status = normalizeString(row.status).toLowerCase();
      return status === 'completed' || status === 'passed';
    }).length;

  const totalEnrollments = currentRows.length;
  const completions = countCompletions(currentRows);
  const completionRate = totalEnrollments > 0 ? (completions / totalEnrollments) * 100 : 0;

  const prevTotalEnrollments = previousRows.length;
  const prevCompletions = countCompletions(previousRows);
  const prevCompletionRate = prevTotalEnrollments > 0 ? (prevCompletions / prevTotalEnrollments) * 100 : 0;

  const calcPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  };

  return {
    list: currentRows
      .map(({ _effectiveDate, ...row }: any) => row)
      .sort(
        (a: any, b: any) =>
          new Date(b.enrolledAt ?? b.createdAt ?? 0).getTime() - new Date(a.enrolledAt ?? a.createdAt ?? 0).getTime()
      ),
    daily: Array.from(dailyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ),
    summary: {
      totalEnrollments,
      completions,
      completionRate,
      enrollmentsChange: calcPercentChange(totalEnrollments, prevTotalEnrollments),
      completionsChange: calcPercentChange(completions, prevCompletions),
      rateChange: calcPercentChange(completionRate, prevCompletionRate),
    },
  };
}

async function getStudentEnrollmentsInternal(identifier: string): Promise<AcademyEnrollment[]> {
  const value = normalizeString(identifier).trim();
  if (!value) return [];

  let query = supabase.from(TABLES.enrollments).select('*').order('created_at', { ascending: false });
  query = value.includes('@')
    ? query.ilike('student_email', value.toLowerCase())
    : query.eq('student_id', value);

  const res = await query;
  if (res.error) {
    console.error('getStudentEnrollments error:', res.error);
    throw new Error(res.error.message);
  }

  return (res.data ?? []).map(mapAcademyEnrollmentRow);
}

async function saveAcademyEnrollmentInternal(input: any): Promise<AcademyEnrollment> {
  const normalizedEmail = normalizeString(input?.studentEmail ?? input?.student_email).trim().toLowerCase();
  const existingProfile = null;

  const enrollmentId = isUuid(input?.id) ? normalizeString(input.id) : makeUuid();
  const studentId = isUuid(input?.studentId ?? input?.student_id)
    ? normalizeString(input?.studentId ?? input?.student_id)
    : null;

  const payload = {
    id: enrollmentId,
    student_id: studentId,
    course_id: normalizeIdOrThrow(input?.courseId ?? input?.course_id, 'course id'),
    session_id: input?.sessionId ?? input?.session_id ?? null,
    student_name: normalizeString(input?.studentName ?? input?.student_name, 'Student'),
    student_email: normalizedEmail || null,
    status: normalizeString(input?.status, 'requested'),
    payment_status: normalizeString(input?.paymentStatus ?? input?.payment_status, 'pending'),
    amount_paid: normalizeNumber(input?.amountPaid ?? input?.amount_paid, 0),
    currency: normalizeString(input?.currency, 'ZAR'),
    enrolled_at: input?.enrolledAt ?? input?.enrolled_at ?? new Date().toISOString(),
    invoice_sent_at: input?.invoiceSentAt ?? input?.invoice_sent_at ?? null,
    payment_confirmed_at: input?.paymentConfirmedAt ?? input?.payment_confirmed_at ?? null,
    notes: input?.notes ?? null,
    proof_of_payment_url: input?.proofOfPaymentUrl ?? input?.proof_of_payment_url ?? null,
  };

  const res = await supabase
    .from(TABLES.enrollments)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (res.error) {
    console.error('saveAcademyEnrollment error:', res.error);
    throw new Error(res.error.message);
  }

  return mapAcademyEnrollmentRow(res.data);
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

function sanitizeCoursePayload(input: any) {
  const images = Array.isArray(input?.images)
    ? input.images.filter((x: any) => typeof x === "string" && x.trim().length > 0)
    : [];

  const learningOutcomesSource = input?.learning_outcomes ?? input?.learningOutcomes;
  const learning_outcomes = Array.isArray(learningOutcomesSource)
    ? learningOutcomesSource.filter((x: any) => typeof x === "string" && x.trim().length > 0)
    : [];

  return {
    title: normalizeString(input?.title),
    description: input?.description ?? null,
    thumbnail: input?.thumbnail ?? null,
    price:
      input?.price != null && input?.price !== ""
        ? Number(input.price)
        : null,
    duration_days:
      input?.duration_days != null && input?.duration_days !== ""
        ? Number(input.duration_days)
        : input?.durationDays != null && input?.durationDays !== ""
        ? Number(input.durationDays)
        : null,
    price_minor:
      input?.price_minor != null && input?.price_minor !== ""
        ? Number(input.price_minor)
        : input?.priceMinor != null && input?.priceMinor !== ""
        ? Number(input.priceMinor)
        : input?.price != null && input?.price !== ""
        ? Math.round(Number(input.price) * 100)
        : null,
    currency: normalizeString(input?.currency, "ZAR"),
    deposit_percent:
      input?.deposit_percent != null && input?.deposit_percent !== ""
        ? Number(input.deposit_percent)
        : input?.depositPercent != null && input?.depositPercent !== ""
        ? Number(input.depositPercent)
        : null,
    instructor_name: input?.instructor_name ?? input?.instructorName ?? null,
    max_students:
      input?.max_students != null && input?.max_students !== ""
        ? Number(input.max_students)
        : input?.maxStudents != null && input?.maxStudents !== ""
        ? Number(input.maxStudents)
        : null,
    images,
    is_active: input?.is_active ?? input?.isActive ?? true,
    status: normalizeString(input?.status, "active"),
    learning_outcomes,
  };
}

async function createCourseInternal(input: any): Promise<any> {
  const payload = {
    id: normalizeString(input?.id),
    ...sanitizeCoursePayload(input),
  };

  const res = await supabase.from(TABLES.courses).insert(payload).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
async function updateCourseInternal(id: string | { id?: string }, patch: any): Promise<any> {
  const courseId = normalizeIdOrThrow(id, "course id");
  const sanitizedPatch = sanitizeCoursePayload(patch);

  const res = await supabase
    .from(TABLES.courses)
    .update(sanitizedPatch)
    .eq("id", courseId)
    .select("*")
    .single();

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
  getCourseSessions: getCourseSessionsInternal,
  getCourseSession: getCourseSessionInternal,
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
  createCourseSession: createCourseSessionInternal,
  updateCourseSession: updateCourseSessionInternal,
  deleteCourseSession: deleteCourseSessionInternal,

  createProduct: createProductInternal,
  updateProduct: updateProductInternal,
  deleteProduct: deleteProductInternal,

  // storage
  uploadCourseImage: uploadCourseImageInternal,
  deleteCourseImage: deleteCourseImageInternal,

  // auth/profile
  getProfile: getProfileInternal,
  saveProfile: saveProfileInternal,
  getAcademyEnrollments: getAcademyEnrollmentsInternal,
  getEnrollmentsReport: getEnrollmentsReportInternal,
  getStudentEnrollments: getStudentEnrollmentsInternal,
  saveAcademyEnrollment: saveAcademyEnrollmentInternal,

  // dashboard
  getKPISummary: getKPISummaryInternal,
};

export default db;