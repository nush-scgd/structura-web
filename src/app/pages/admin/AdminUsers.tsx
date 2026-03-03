import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/db";

type AdminInvite = {
  id: string;
  email: string;
  role: "admin";
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

type Profile = {
  id: string;
  role: "student" | "customer" | "admin";
  fullName: string;
  email: string;
  status?: "active" | "suspended";
  createdAt: string;
};

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);

  async function loadData() {
    setLoading(true);
    setErr(null);

    try {
      const [p, i] = await Promise.all([
        db.getProfiles().catch(() => []),
        db.getAdminInvites().catch(() => []),
      ]);

      const safeProfiles = Array.isArray(p) ? p : [];
      const safeInvites = Array.isArray(i) ? i : [];

      setProfiles(safeProfiles as any);
      setInvites(safeInvites as any);
    } catch (e: any) {
      console.error("AdminUsers loadData error:", e);
      setErr(e?.message || "Failed to load admin users.");
      setProfiles([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeInvites = useMemo(
    () => invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt).getTime() > Date.now()),
    [invites]
  );

  const admins = useMemo(() => profiles.filter((p) => p.role === "admin"), [profiles]);

  if (loading) {
    return (
      <div className="p-10">
        <div className="text-sm">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin Users</h1>
          <p className="text-sm opacity-70">Manage admin access and invitations.</p>
        </div>

        <button
          className="px-4 py-2 border rounded-md text-sm"
          onClick={() => loadData()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="border rounded-md p-4 text-sm">
          <div className="font-medium mb-1">Couldn’t load this page fully</div>
          <div className="opacity-80">{err}</div>
          <div className="mt-3">
            <button className="px-3 py-2 border rounded-md text-sm" onClick={() => loadData()} type="button">
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <section className="border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Current Admins</h2>

        {admins.length === 0 ? (
          <div className="text-sm opacity-70">No admin profiles found yet.</div>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.fullName || "Unnamed Admin"}</div>
                  <div className="text-sm opacity-70 truncate">{a.email}</div>
                </div>
                <div className="text-xs opacity-60">{a.status ?? "active"}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Pending Invites</h2>

        {activeInvites.length === 0 ? (
          <div className="text-sm opacity-70">No pending invites.</div>
        ) : (
          <div className="space-y-2">
            {activeInvites.map((inv) => (
              <div key={inv.token} className="flex items-center justify-between border rounded-md p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{inv.email}</div>
                  <div className="text-sm opacity-70 truncate">
                    Expires: {new Date(inv.expiresAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs opacity-60">pending</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}