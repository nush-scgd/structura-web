// src/app/pages/public/ServicesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import db from "../../../lib/db";

type ServiceRow = {
  id: string;
  name?: string | null;
  title?: string | null;
  category?: string | null;
  currency?: string | null;
  price_minor?: number | null;
  price?: number | null;       // legacy numeric
  from_price?: number | null;  // legacy numeric
  duration_minutes?: number | null;
  duration?: string | null;    // legacy
  image_url?: string | null;
  images?: any;
  description?: string | null;
  is_active?: boolean | null;
  status?: string | null;
};

type BookingSettingsSafe = {
  globalRedirectActive: boolean;
  bookingUrl: string;
  ctaLabel: string;
  openInNewTab: boolean;
};

function s(v: any, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}
function b(v: any, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}
function n(v: any): number | null {
  const num = typeof v === "number" ? v : v == null ? NaN : Number(v);
  return Number.isFinite(num) ? num : null;
}

function moneyFromMinor(priceMinor: number | null | undefined): number | null {
  if (priceMinor == null) return null;
  return priceMinor / 100;
}

function formatMoney(amount: number | null, currencyCode?: string | null) {
  if (amount == null) return "";
  const code = s(currencyCode, "ZAR");
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // fallback when currency not supported by runtime
    return `${code} ${amount.toFixed(2)}`;
  }
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  // Safe defaults so the page never dies if booking_settings is mis-shaped
  const [bookingSettings, setBookingSettings] = useState<BookingSettingsSafe>({
    globalRedirectActive: true,
    bookingUrl: "https://structurahair.booksy.com",
    ctaLabel: "Book Now",
    openInNewTab: true,
  });

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      // 1) load services (this must work regardless of booking settings)
      const svc = await db.getServices?.();
      const normalized: ServiceRow[] = (Array.isArray(svc) ? svc : []).map((row: any) => ({
        ...row,
        id: s(row.id),
        name: row.name ?? row.title ?? "",
        title: row.title ?? row.name ?? "",
        category: row.category ?? "",
        currency: row.currency ?? "ZAR",
      }));

      // Sort safely (no localeCompare on null)
      normalized.sort((a, bb) => s(a.name).localeCompare(s(bb.name)));

      // 2) booking settings (best effort)
      try {
        const bs: any = await db.getBookingSettings?.();
        const next: BookingSettingsSafe = {
          globalRedirectActive: b(bs?.globalRedirectActive, true),
          bookingUrl: s(bs?.bookingUrl, "https://structurahair.booksy.com"),
          ctaLabel: s(bs?.defaultCtaLabel ?? bs?.ctaLabel, "Book Now"),
          openInNewTab: b(bs?.openInNewTab, true),
        };
        if (alive) setBookingSettings(next);
      } catch {
        // swallow; keep defaults
      }

      if (alive) {
        setServices(normalized);
        setLoading(false);
      }
    };

    load().catch(() => {
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const svc of services) {
      const c = s(svc.category).trim();
      if (c) set.add(c);
    }
    return ["All", ...Array.from(set).sort((a, bb) => a.localeCompare(bb))];
  }, [services]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((svc) => {
      const name = s(svc.name).toLowerCase();
      const desc = s(svc.description).toLowerCase();
      const cat = s(svc.category);

      const matchesSearch = !q || name.includes(q) || desc.includes(q);
      const matchesCategory = category === "All" || cat === category;

      // if you later want to hide inactive services publicly, uncomment:
      // const active = svc.is_active !== false && svc.status !== "inactive";
      // return active && matchesSearch && matchesCategory;

      return matchesSearch && matchesCategory;
    });
  }, [services, search, category]);

  const handleBookNow = () => {
    const url = bookingSettings.bookingUrl;
    if (!url) return;
    if (bookingSettings.openInNewTab) window.open(url, "_blank", "noopener,noreferrer");
    else window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal font-serif">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl tracking-tight">Services</h1>
            <p className="text-sm text-charcoal/70 mt-1">
              Explore the salon menu, pricing, and durations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {bookingSettings.globalRedirectActive && (
              <button
                onClick={handleBookNow}
                className="px-5 py-3 bg-black text-white rounded-md tracking-wide"
              >
                {bookingSettings.ctaLabel || "Book Now"}
              </button>
            )}
            <Link
              to="/academy"
              className="px-5 py-3 border border-black/15 rounded-md"
            >
              Academy
            </Link>
          </div>
        </div>

        <div className="mt-8 flex gap-3 flex-wrap items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full md:w-96 px-4 py-3 rounded-md border border-black/10 bg-white"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 rounded-md border border-black/10 bg-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="text-sm text-charcoal/70 ml-auto">
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="py-24 text-center text-charcoal/60">Loading services…</div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-black/20 rounded-lg py-24 text-center">
              <div className="text-xl text-charcoal/70">No services found</div>
              <div className="text-sm text-charcoal/50 mt-2">
                Try another search or category.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((svc) => {
                const displayName = s(svc.name || svc.title, "Service");
                const currency = s(svc.currency, "ZAR");

                // Prefer price_minor, fallback to numeric price
                const main = moneyFromMinor(n(svc.price_minor));
                const legacyPrice = n(svc.price);
                const priceValue = main ?? legacyPrice;

                const legacyFrom = n(svc.from_price);
                const fromValue = legacyFrom != null && legacyFrom > 0 ? legacyFrom : null;

                const duration = svc.duration_minutes ?? (svc.duration ? Number(svc.duration) : null);
                const durationLabel = duration ? `${duration} min` : "";

                const image =
                  s(svc.image_url) ||
                  (Array.isArray(svc.images) ? svc.images?.[0] : null) ||
                  (typeof svc.images === "object" ? svc.images?.[0] : null) ||
                  "";

                return (
                  <div
                    key={s(svc.id)}
                    className="bg-white border border-black/10 rounded-xl overflow-hidden"
                  >
                    {image ? (
                      <div className="h-44 bg-black/5">
                        <img
                          src={image}
                          alt={displayName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-widest text-charcoal/60">
                            {s(svc.category, "Salon")}
                          </div>
                          <h3 className="text-xl mt-1">{displayName}</h3>
                          {svc.description ? (
                            <p className="text-sm text-charcoal/70 mt-2 leading-relaxed">
                              {svc.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-right whitespace-nowrap">
                          {fromValue != null ? (
                            <div className="text-xs text-charcoal/60">
                              from {formatMoney(fromValue, currency)}
                            </div>
                          ) : null}
                          <div className="text-lg">
                            {priceValue != null ? formatMoney(priceValue, currency) : ""}
                          </div>
                          {durationLabel ? (
                            <div className="text-xs text-charcoal/60 mt-1">{durationLabel}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}