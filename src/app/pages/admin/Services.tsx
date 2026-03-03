import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  currency: string;
  priceMinor: number | null;
  price: number | null; // major
  durationMinutes: number | null;
  stylistId: string | null;
  isActive: boolean;
  sortOrder: number;
};

type StylistRow = {
  id: string;
  name: string;
  isActive: boolean;
};

const s = (v: unknown, fallback = "") => {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
};

const n = (v: unknown, fallback: number | null = null): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  }
  return fallback;
};

const b = (v: unknown, fallback = false): boolean => {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  if (typeof v === "string") {
    const x = v.toLowerCase();
    if (x === "active") return true;
    if (x === "inactive") return false;
  }
  return fallback;
};

const formatMoney = (amountMajor: number | null, currency: string) => {
  if (amountMajor == null || !Number.isFinite(amountMajor)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "ZAR",
      maximumFractionDigits: 2,
    }).format(amountMajor);
  } catch {
    return `${currency || "ZAR"} ${amountMajor.toFixed(2)}`;
  }
};

function derivePrice(row: any): { priceMinor: number | null; price: number | null } {
  // Prefer price_minor.
  const pm = n(row?.price_minor ?? row?.priceMinor, null);
  if (pm != null) return { priceMinor: Math.round(pm), price: Math.round(pm) / 100 };

  const p = n(row?.price, null);
  if (p == null) return { priceMinor: null, price: null };

  // Heuristic: if stored as cents (e.g. 95000), convert.
  if (p >= 10000) return { priceMinor: Math.round(p), price: Math.round(p) / 100 };

  // Otherwise assume major.
  return { priceMinor: Math.round(p * 100), price: p };
}

function normalizeService(row: any): ServiceRow {
  const { priceMinor, price } = derivePrice(row);

  return {
    id: s(row?.id),
    name: s(row?.name ?? row?.title),
    category: row?.category != null ? s(row.category) : null,
    currency: s(row?.currency, "ZAR"),
    priceMinor,
    price,
    durationMinutes: n(row?.duration_minutes ?? row?.durationMinutes, null),
    stylistId: row?.stylist_id != null ? s(row.stylist_id) : row?.stylistId != null ? s(row.stylistId) : null,
    isActive: b(row?.is_active ?? row?.isActive ?? row?.active ?? row?.status, true),
    sortOrder: (n(row?.sort_order ?? row?.sortOrder, 0) ?? 0) as number,
  };
}

function normalizeStylist(row: any): StylistRow {
  return {
    id: s(row?.id),
    name: s(row?.name ?? row?.full_name ?? row?.display_name),
    isActive: b(row?.is_active ?? row?.isActive ?? row?.active ?? row?.status, true),
  };
}

export default function AdminServices() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [stylists, setStylists] = useState<StylistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [stylist, setStylist] = useState("All Stylists");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [svcRes, stylistRes] = await Promise.all([
          supabase
            .from("services")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("stylists")
            .select("*")
            .order("name", { ascending: true }),
        ]);

        if (svcRes.error) throw svcRes.error;
        if (stylistRes.error) {
          // Stylists are optional; we still show services.
          console.warn("[AdminServices] stylists load failed:", stylistRes.error);
        }

        const normalizedServices = (svcRes.data ?? [])
          .map(normalizeService)
          .filter((x) => x.id && x.name)
          .sort((a, b) => s(a.name, "").localeCompare(s(b.name, "")));

        const normalizedStylists = (stylistRes.data ?? [])
          .map(normalizeStylist)
          .filter((x) => x.id && x.name)
          .sort((a, b) => s(a.name, "").localeCompare(s(b.name, "")));

        setServices(normalizedServices);
        setStylists(normalizedStylists);
      } catch (e: any) {
        console.error("[AdminServices] loadData failed:", e);
        setError(e?.message ?? String(e));
        setServices([]);
        setStylists([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((svc) => {
      const c = (svc.category ?? "").trim();
      if (c) set.add(c);
    });
    return ["All Categories", ...Array.from(set).sort((a, b) => s(a, "").localeCompare(s(b, "")))];
  }, [services]);

  const stylistOptions = useMemo(() => {
    return [
      { id: "All Stylists", name: "All Stylists" },
      ...stylists.map((x) => ({ id: x.id, name: x.name })),
    ];
  }, [stylists]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((svc) => {
      if (q) {
        const hay = `${svc.name} ${svc.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (category !== "All Categories") {
        if ((svc.category ?? "") !== category) return false;
      }
      if (stylist !== "All Stylists") {
        if ((svc.stylistId ?? "") !== stylist) return false;
      }
      return true;
    });
  }, [services, search, category, stylist]);

  const stylistNameById = useMemo(() => {
    const map = new Map<string, string>();
    stylists.forEach((x) => map.set(x.id, x.name));
    return map;
  }, [stylists]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-serif text-charcoal">Salon Services</h1>
        <button className="px-6 py-3 bg-charcoal text-white font-medium tracking-wide hover:bg-charcoal/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          ADD SERVICE
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="font-medium">Failed to load services</div>
          <div className="mt-1 opacity-80">{error}</div>
        </div>
      ) : null}

      <div className="bg-white p-6 rounded-lg border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold/20 focus:border-gold"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold/20 focus:border-gold"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={stylist}
            onChange={(e) => setStylist(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold/20 focus:border-gold"
          >
            {stylistOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                Service Name
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                Stylist
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                Active
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                  Loading services…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                  No services found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-charcoal">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{service.category ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {service.stylistId ? stylistNameById.get(service.stylistId) ?? "—" : "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatMoney(service.price, service.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        service.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gold transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}