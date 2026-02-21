import { supabase } from "./supabaseClient";
import { generateId } from "./utils";
import { projectId, publicAnonKey } from "/utils/supabase/info";

// ======================================================
// SUPABASE CLIENT (BROWSER-SAFE) — YOU SAID "EXCEPT THIS"
// ======================================================
// Add this import at the top (or wherever your imports live):
//   import { createClient } from "@supabase/supabase-js";
//
// And add this const here:
//   const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
//
// ======================================================

// ----------------------------
// KV Store API Client (legacy)
// ----------------------------
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-38a20121`;

async function fetchKV(path: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      console.warn(`KV Fetch Error ${res.status}: ${res.statusText}`);
      return null;
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("KV Network Error:", e);
    return null;
  }
}

export const kv = {
  get: async (key: string) => await fetchKV(`/kv/${encodeURIComponent(key)}`),
  set: async (key: string, value: any) =>
    await fetchKV("/kv", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),
  del: async (key: string) =>
    await fetchKV(`/kv/${encodeURIComponent(key)}`, {
      method: "DELETE",
      body: JSON.stringify({ key }),
    }),
  getByPrefix: async (prefix: string) => {
    const res = await fetchKV(`/kv/prefix/${encodeURIComponent(prefix)}`);
    return Array.isArray(res) ? res : [];
  },
};

// --- TYPES ---

export interface PlatformSettings {
  academyPaymentMode: "PAY_BEFORE_ACCESS" | "PAY_AFTER_ACCESS" | "NO_PAYMENTS";
  shopEnabled: boolean;
  checkoutEnabled: boolean;
  courseAccessWithoutPayment: boolean;
}

export interface TenantSettings {
  defaultCurrency: string;
  allowedCurrencies: string[];
  paymentProviders: Record<string, string>;
}

export interface BookingSettings {
  bookingUrl: string;
  provider: "booksy" | "fresha" | "vagaro" | "custom";
  isActive: boolean;
}

export interface Profile {
  id: string; // matches auth user id
  tenantId?: string;
  role: "student" | "customer" | "admin";
  fullName: string;
  email: string;
  phone?: string;
  status?: "active" | "suspended";
  deletedAt?: string;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  brandId?: string;
  description?: string;
  bannerImageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  productIds: string[];
  bundleIds: string[];
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  sku?: string;
  priceMinor: number;
  currency: string;
  compareAtPriceMinor?: number;
  brandId?: string;
  trackInventory: boolean;
  images: string[];
  isActive: boolean;
  featured?: boolean;
  sortOrder?: number;
  createdAt: string;
}

export interface InventoryItem {
  id: string; // productId
  onHand: number;
  reserved: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  status: "pending" | "paid" | "completed" | "shipped" | "cancelled";
  paymentProvider: string;
  total: number;
  currency: string;
  items: any[];
  createdAt: string;
  branchId?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  thumbnailUrl?: string;
  published: boolean;
}

export interface Session {
  id: string;
  courseId: string;
  startDate: string;
  endDate: string;
  location: string;
  capacity: number;
  enrolledCount: number;
  instructorId?: string;
}

export interface Instructor {
  id: string;
  name: string;
  bio?: string;
  specialty?: string;
  imageUrl?: string;
  email?: string;
}

export interface AcademyEnrollment {
  id: string;
  courseId: string;
  sessionId?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "pending" | "confirmed" | "completed" | "dropped" | "passed";
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  amountPaid: number;
  currency: string;
  enrolledAt: string;
  grade?: string;
  passed?: boolean;
  certificateIssued?: boolean;
  certificateIssuedAt?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number; // minor units
  durationMinutes: number;
  imageUrl?: string;
}

// NEW (prod tables)
export interface Stylist {
  id: string;
  name: string;
  bio?: string;
  titleLine?: string;
  profileImageUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
  specialties: string[];
  instagramUrl?: string;
}

export interface AdminInvite {
  id: string;
  email: string;
  role: "admin";
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

// ----------------------------
// Helpers for DB mapping
// ----------------------------
function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function nowIso() {
  return new Date().toISOString();
}

// ----------------------------
// DB ADAPTER
// ----------------------------
export const db = {
  // =========================
  // SETTINGS (migrate later)
  // =========================
  async getPlatformSettings(): Promise<PlatformSettings> {
    return (
      (await kv.get("settings:platform")) || {
        academyPaymentMode: "PAY_BEFORE_ACCESS",
        shopEnabled: true,
        checkoutEnabled: true,
        courseAccessWithoutPayment: false,
      }
    );
  },
  async savePlatformSettings(settings: PlatformSettings) {
    await kv.set("settings:platform", settings);
  },

  // =========================
  // PROFILES (still KV for now)
  // =========================
  async getProfiles(): Promise<Profile[]> {
    const profiles = (await kv.getByPrefix("profile:")) || [];
    return profiles.filter((p: any) => !p.deletedAt);
  },
  async getProfile(id: string): Promise<Profile | null> {
    const p = await kv.get(`profile:${id}`);
    if (p && p.deletedAt) return null;
    return p;
  },
  async saveProfile(profile: Profile) {
    await kv.set(`profile:${profile.id}`, profile);
  },
  async deleteProfile(id: string) {
    const profile = await kv.get(`profile:${id}`);
    if (profile) {
      profile.deletedAt = nowIso();
      await kv.set(`profile:${id}`, profile);
    }
  },

  // =========================
  // ADMIN INVITES (still KV)
  // =========================
  async createAdminInvite(email: string): Promise<AdminInvite> {
    const token = generateId();
    const invite: AdminInvite = {
      id: generateId(),
      email,
      role: "admin",
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: nowIso(),
    };
    await kv.set(`invite:${token}`, invite);
    return invite;
  },
  async getAdminInvite(token: string): Promise<AdminInvite | null> {
    return await kv.get(`invite:${token}`);
  },
  async markAdminInviteUsed(token: string) {
    const invite = await this.getAdminInvite(token);
    if (invite) {
      invite.usedAt = nowIso();
      await kv.set(`invite:${token}`, invite);
    }
  },
  async getAdminInvites(): Promise<AdminInvite[]> {
    return (await kv.getByPrefix("invite:")) || [];
  },

  // ======================================================
  // ✅ PROD CUTOVER SECTION (real tables, RLS-safe)
  // ======================================================

  // ---- BRANDS (prod table) ----
  async getBrands(): Promise<Brand[]> {
    // @ts-ignore - supabase defined in your "except" block
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getBrands error:", error.message);
      return [];
    }

    return (data ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description ?? undefined,
      logoUrl: b.logo_url ?? undefined,
      isActive: !!b.is_active,
      createdAt: b.created_at ?? nowIso(),
    }));
  },

  async saveBrand(brand: Brand) {
    // @ts-ignore
    const { error } = await supabase.from("brands").upsert({
      id: brand.id,
      name: brand.name,
      description: brand.description ?? null,
      logo_url: brand.logoUrl ?? null,
      is_active: brand.isActive,
      created_at: brand.createdAt ?? nowIso(),
    });

    if (error) throw new Error(error.message);
  },

  // ---- PRODUCTS (prod table) ----
  async getProducts(): Promise<Product[]> {
    // @ts-ignore
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("getProducts error:", error.message);
      return [];
    }

    return (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug ?? p.id,
      description: p.description ?? "",
      sku: p.sku ?? undefined,
      priceMinor: p.price_minor ?? 0,
      currency: p.currency ?? "ZAR",
      compareAtPriceMinor: p.compare_at_price_minor ?? undefined,
      brandId: p.brand_id ?? undefined,
      trackInventory: !!p.track_inventory,
      images: safeArray<string>(p.images),
      isActive: !!p.is_active,
      featured: p.featured ?? false,
      sortOrder: p.sort_order ?? 0,
      createdAt: p.created_at ?? nowIso(),
    }));
  },

  async getProduct(id: string): Promise<Product | null> {
    // @ts-ignore
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("getProduct error:", error.message);
      return null;
    }
    if (!data) return null;

    const p: any = data;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug ?? p.id,
      description: p.description ?? "",
      sku: p.sku ?? undefined,
      priceMinor: p.price_minor ?? 0,
      currency: p.currency ?? "ZAR",
      compareAtPriceMinor: p.compare_at_price_minor ?? undefined,
      brandId: p.brand_id ?? undefined,
      trackInventory: !!p.track_inventory,
      images: safeArray<string>(p.images),
      isActive: !!p.is_active,
      featured: p.featured ?? false,
      sortOrder: p.sort_order ?? 0,
      createdAt: p.created_at ?? nowIso(),
    };
  },

  async saveProduct(product: Product) {
    // @ts-ignore
    const { error } = await supabase.from("products").upsert({
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description ?? null,
      sku: product.sku ?? null,
      price_minor: product.priceMinor ?? 0,
      currency: product.currency ?? "ZAR",
      compare_at_price_minor: product.compareAtPriceMinor ?? null,
      brand_id: product.brandId ?? null,
      track_inventory: product.trackInventory ?? false,
      images: product.images ?? [],
      is_active: product.isActive ?? true,
      featured: product.featured ?? false,
      sort_order: product.sortOrder ?? 0,
      created_at: product.createdAt ?? nowIso(),
    });

    if (error) throw new Error(error.message);
  },

  // ---- COLLECTIONS (prod table) ----
  async getCollections(): Promise<Collection[]> {
    // @ts-ignore
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("getCollections error:", error.message);
      return [];
    }

    // productIds/bundleIds now live in join tables; keep empty for now
    return (data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug ?? c.id,
      brandId: c.brand_id ?? undefined,
      description: c.description ?? undefined,
      bannerImageUrl: c.banner_image_url ?? undefined,
      isActive: !!c.is_active,
      sortOrder: c.sort_order ?? 0,
      productIds: [],
      bundleIds: [],
      createdAt: c.created_at ?? nowIso(),
    }));
  },

  async saveCollection(collection: Collection) {
    // @ts-ignore
    const { error } = await supabase.from("collections").upsert({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      brand_id: collection.brandId ?? null,
      description: collection.description ?? null,
      banner_image_url: collection.bannerImageUrl ?? null,
      is_active: collection.isActive ?? true,
      sort_order: collection.sortOrder ?? 0,
      created_at: collection.createdAt ?? nowIso(),
    });

    if (error) throw new Error(error.message);

    // Join tables can be handled next (collection_products / collection_bundles)
  },

  // ---- INVENTORY (prod table) ----
  async getInventory(productId: string): Promise<InventoryItem> {
    // @ts-ignore
    const { data, error } = await supabase
      .from("product_inventory")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      console.warn("getInventory error:", error.message);
    }

    if (!data) {
      return { id: productId, onHand: 0, reserved: 0, updatedAt: nowIso() };
    }

    return {
      id: data.product_id,
      onHand: data.on_hand ?? 0,
      reserved: data.reserved ?? 0,
      updatedAt: data.updated_at ?? nowIso(),
    };
  },

  async updateInventory(productId: string, change: number, reason: string) {
    const item = await this.getInventory(productId);
    const nextOnHand = (item.onHand ?? 0) + change;

    // @ts-ignore
    const { error } = await supabase.from("product_inventory").upsert({
      product_id: productId,
      on_hand: nextOnHand,
      reserved: item.reserved ?? 0,
      updated_at: nowIso(),
    });

    if (error) throw new Error(error.message);
  },

  // ---- STYLISTS (prod table) ----
  async getStylists(): Promise<Stylist[]> {
    // @ts-ignore
    const { data, error } = await supabase
      .from("stylists")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getStylists error:", error.message);
      return [];
    }

    return (data ?? []).map((st: any) => ({
      id: st.id,
      name: st.name,
      bio: st.bio ?? undefined,
      titleLine: st.title_line ?? undefined,
      profileImageUrl: st.profile_image_url ?? undefined,
      isActive: !!st.is_active,
      createdAt: st.created_at ?? nowIso(),
    }));
  },

  // ---- SERVICES (prod table, mapped to existing Service interface) ----
  async getServices(): Promise<Service[]> {
    // @ts-ignore
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("getServices error:", error.message);
      return [];
    }

    return (data ?? []).map((s: any) => ({
      id: s.id,
      categoryId: s.category ?? "general",
      name: s.name,
      description: s.description ?? undefined,
      price: s.price_minor ?? 0,
      durationMinutes: s.duration_minutes ?? 60,
      imageUrl: s.image_url ?? undefined,
    }));
  },

  async saveService(service: Service) {
    // @ts-ignore
    const { error } = await supabase.from("services").upsert({
      id: service.id,
      name: service.name,
      category: service.categoryId ?? "general",
      description: service.description ?? null,
      currency: "ZAR",
      price_minor: service.price ?? 0,
      duration_minutes: service.durationMinutes ?? 60,
      image_url: service.imageUrl ?? null,
      is_active: true,
      sort_order: 0,
      created_at: nowIso(),
    });

    if (error) throw new Error(error.message);
  },

  async deleteService(id: string) {
    // @ts-ignore
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  // ---- COURSES (prod table, mapped) ----
  async getCourses(): Promise<Course[]> {
    // @ts-ignore
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getCourses error:", error.message);
      return [];
    }

    return (data ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      slug: c.slug ?? c.id, // temporary
      description: c.description ?? "",
      price: c.price ?? 0,
      currency: "ZAR", // temporary default
      thumbnailUrl: c.thumbnail ?? undefined,
      published: true,
    }));
  },

  async saveCourse(course: Course) {
    // @ts-ignore
    const { error } = await supabase.from("courses").upsert({
      id: course.id,
      title: course.title,
      description: course.description ?? null,
      thumbnail: course.thumbnailUrl ?? null,
      price: course.price ?? 0,
      created_at: nowIso(),
    });

    if (error) throw new Error(error.message);
  },

  async deleteCourse(id: string) {
    // @ts-ignore
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  // ======================================================
  // EVERYTHING BELOW STILL USES KV (migrate later)
  // ======================================================

  async getAllOrders(): Promise<Order[]> {
    return (await kv.getByPrefix("order:")) || [];
  },
  async getOrder(id: string): Promise<Order | null> {
    return await kv.get(`order:${id}`);
  },
  async saveOrder(order: Order) {
    await kv.set(`order:${order.id}`, order);
  },

  async getAcademyEnrollments(): Promise<AcademyEnrollment[]> {
    return (await kv.getByPrefix("aca_enrollment:")) || [];
  },

  async getTenantSettings(): Promise<TenantSettings | null> {
    return await kv.get("settings:tenant");
  },
  async saveTenantSettings(settings: TenantSettings) {
    await kv.set("settings:tenant", settings);
  },
  async getBookingSettings(): Promise<BookingSettings | null> {
    return await kv.get("settings:booking");
  },
  async saveBookingSettings(settings: BookingSettings) {
    await kv.set("settings:booking", settings);
  },

  async getSessions(): Promise<Session[]> {
    return (await kv.getByPrefix("session:")) || [];
  },
  async saveSession(session: Session) {
    await kv.set(`session:${session.id}`, session);
  },
  async deleteSession(id: string) {
    await kv.del(`session:${id}`);
  },
  async getInstructors(): Promise<Instructor[]> {
    return (await kv.getByPrefix("instructor:")) || [];
  },
  async saveInstructor(instructor: Instructor) {
    await kv.set(`instructor:${instructor.id}`, instructor);
  },
  async deleteInstructor(id: string) {
    await kv.del(`instructor:${id}`);
  },

  async saveAcademyEnrollment(enrollment: AcademyEnrollment) {
    await kv.set(`aca_enrollment:${enrollment.id}`, enrollment);
  },

  async getServiceCategories(): Promise<ServiceCategory[]> {
    return (await kv.getByPrefix("service_cat:")) || [];
  },
  async saveServiceCategory(category: ServiceCategory) {
    await kv.set(`service_cat:${category.id}`, category);
  },
  async deleteServiceCategory(id: string) {
    await kv.del(`service_cat:${id}`);
  },

  async getTeamMembers(): Promise<TeamMember[]> {
    return (await kv.getByPrefix("team:")) || [];
  },
  async saveTeamMember(member: TeamMember) {
    await kv.set(`team:${member.id}`, member);
  },
  async deleteTeamMember(id: string) {
    await kv.del(`team:${id}`);
  },

  // Reporting methods remain KV-based for now (migrate later)
  async getRevenueReport(startDate: Date, endDate: Date) {
    const orders = await this.getAllOrders();
    const enrollments = await this.getAcademyEnrollments();

    const inRange = (d: string) => {
      const time = new Date(d).getTime();
      return time >= startDate.getTime() && time <= endDate.getTime();
    };

    const periodOrders = orders.filter((o) => inRange(o.createdAt));
    const periodEnrollments = enrollments.filter((e) => inRange(e.enrolledAt));

    const orderRevenue = periodOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const courseRevenue = periodEnrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);
    const netRevenue = orderRevenue + courseRevenue;

    const grossRevenue = Math.round(netRevenue * 1.05);
    const refunds = Math.round(netRevenue * 0.02);
    const discounts = Math.round(netRevenue * 0.03);

    const diff = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - diff);
    const prevEnd = new Date(startDate.getTime());

    const prevOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    });
    const prevEnrollments = enrollments.filter((e) => {
      const t = new Date(e.enrolledAt).getTime();
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    });

    const prevRevenue =
      prevOrders.reduce((sum, o) => sum + (o.total || 0), 0) +
      prevEnrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);

    const changePercent =
      prevRevenue === 0 ? (netRevenue > 0 ? 100 : 0) : ((netRevenue - prevRevenue) / prevRevenue) * 100;

    const dailyMap = new Map<string, number>();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyMap.set(d.toISOString().split("T")[0], 0);
    }

    periodOrders.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().split("T")[0];
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + (o.total || 0));
    });
    periodEnrollments.forEach((e) => {
      const key = new Date(e.enrolledAt).toISOString().split("T")[0];
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + (e.amountPaid || 0));
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, val]) => ({ date, netRevenue: val }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byType = [
      { name: "Products", value: orderRevenue },
      { name: "Courses", value: courseRevenue },
    ];

    const itemMap = new Map<string, { name: string; type: string; quantity: number; revenue: number }>();

    periodOrders.forEach((o) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((i) => {
          const id = i.id || i.productId || "unknown";
          const entry = itemMap.get(id) || { name: i.title || i.name || "Unknown", type: "Product", quantity: 0, revenue: 0 };
          entry.quantity += i.quantity || 1;
          entry.revenue += (i.price || 0) * (i.quantity || 1);
          itemMap.set(id, entry);
        });
      }
    });

    periodEnrollments.forEach((e) => {
      const id = e.courseId;
      const entry = itemMap.get(id) || { name: "Course " + id.slice(0, 4), type: "Course", quantity: 0, revenue: 0 };
      entry.quantity += 1;
      entry.revenue += e.amountPaid || 0;
      itemMap.set(id, entry);
    });

    const topItems = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      summary: { netRevenue, grossRevenue, refunds, discounts, changePercent },
      daily,
      byType,
      topItems,
    };
  },

  async seedIfNeeded() {
    const brands = await this.getBrands();
    if (brands.length === 0) {
      console.log("Seeding would happen here...");
    }
  },
};