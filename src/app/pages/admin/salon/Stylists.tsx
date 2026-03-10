import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../../../lib/db";
import type { Stylist } from "../../../../lib/db";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Check, X, User } from "lucide-react";
import { generateId } from "../../../../lib/utils";

type StylistFormState = {
  id?: string;
  name: string;
  titleLine?: string;
  bio?: string;
  profileImageUrl?: string;
  isActive: boolean;
  createdAt?: string;
};

const emptyForm = (): StylistFormState => ({
  name: "",
  titleLine: "",
  bio: "",
  profileImageUrl: "",
  isActive: true,
});

export default function Stylists() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StylistFormState>(emptyForm());

  const isEditing = useMemo(() => !!editingId, [editingId]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await db.getStylists();
      setStylists(data);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load stylists");
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(st: Stylist) {
    setEditingId(st.id);
    setForm({
      id: st.id,
      name: st.name ?? "",
      titleLine: st.titleLine ?? "",
      bio: st.bio ?? "",
      profileImageUrl: st.profileImageUrl ?? "",
      isActive: st.isActive ?? true,
      createdAt: st.createdAt,
    });
  }

  function cancel() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function onDelete(id: string) {
    const st = stylists.find((s) => s.id === id);
    const label = st?.name ? `“${st.name}”` : "this stylist";

    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;

    try {
      setSaving(true);
      await db.deleteStylist(id);
      toast.success("Stylist deleted");
      await load();
      if (editingId === id) cancel();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ? `Delete failed: ${e.message}` : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    const now = new Date().toISOString();
    const id = editingId ?? form.id ?? generateId();

    // Preserve createdAt on edits
    const existingCreatedAt =
      stylists.find((s) => s.id === id)?.createdAt ?? form.createdAt ?? now;

    const payload: Stylist = {
      id,
      name: form.name.trim(),
      titleLine: form.titleLine?.trim() || undefined,
      bio: form.bio?.trim() || undefined,
      profileImageUrl: form.profileImageUrl?.trim() || undefined,
      isActive: form.isActive ?? true,
      createdAt: existingCreatedAt,
    };

    try {
      setSaving(true);
      await db.saveStylist(payload);
      toast.success(isEditing ? "Stylist updated" : "Stylist created");
      cancel();
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ? `Save failed: ${e.message}` : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Stylists</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and remove stylists shown on the Salon site.
          </p>
        </div>

        <Button onClick={startCreate} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" />
          New stylist
        </Button>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full border flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>

          <div>
            <div className="font-display tracking-wide">
              {isEditing ? "Edit stylist" : "Create stylist"}
            </div>
            <div className="text-sm text-muted-foreground">
              {isEditing
                ? "Update details and save changes."
                : "Fill in details and save to create a new stylist."}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Monique"
            />
          </div>

          <div className="space-y-2">
            <Label>Title / Role</Label>
            <Input
              value={form.titleLine ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, titleLine: e.target.value }))
              }
              placeholder="e.g., Senior Stylist & Lecturer"
            />
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={form.bio ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Short bio shown on the site…"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Profile Image URL</Label>
            <Input
              value={form.profileImageUrl ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, profileImageUrl: e.target.value }))
              }
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              For now this is a URL field. Later we’ll swap to Supabase Storage
              upload.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">Active</div>
              <div className="text-sm text-muted-foreground">
                Visible on the site if enabled.
              </div>
            </div>
            <Switch
              checked={!!form.isActive}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              <Check className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save stylist"}
            </Button>

            <Button type="button" variant="outline" onClick={cancel} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-xl border bg-card">
        <div className="p-6 border-b">
          <div className="font-display tracking-wide">All stylists</div>
          <div className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${stylists.length} stylist(s)`}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading stylists…</div>
          ) : stylists.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No stylists yet. Create your first one.
            </div>
          ) : (
            <div className="space-y-3">
              {stylists.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="font-medium truncate">{st.name}</div>
                      {!st.isActive && (
                        <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                          inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate mt-1">
                      {st.titleLine || "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => startEdit(st)}
                      disabled={saving}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => onDelete(st.id)}
                      disabled={saving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}