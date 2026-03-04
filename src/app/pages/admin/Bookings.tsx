import React, { useEffect, useMemo, useState } from "react";
import { db, BookingSettings } from "../../../lib/db";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { toast } from "sonner";

const DEFAULT_SETTINGS: BookingSettings = {
  providerId: "booksy",
  bookingUrl: "",
  ctaLabel: "Book Now",
  openInNewTab: true,
};

export default function AdminBookings() {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await db.getBookingSettings();
        if (!cancelled) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...(data ?? {}),
            providerId: (data?.providerId ?? DEFAULT_SETTINGS.providerId) as any,
            bookingUrl: data?.bookingUrl ?? DEFAULT_SETTINGS.bookingUrl,
            ctaLabel: data?.ctaLabel ?? DEFAULT_SETTINGS.ctaLabel,
            openInNewTab: data?.openInNewTab ?? DEFAULT_SETTINGS.openInNewTab,
          });
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load booking settings");
        if (!cancelled) setSettings(DEFAULT_SETTINGS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isValidUrl = useMemo(() => {
    const raw = (settings.bookingUrl ?? "").trim();
    if (!raw) return true;
    try {
      const u = new URL(raw);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, [settings.bookingUrl]);

  const handleSave = async () => {
    if (!isValidUrl) {
      toast.error("Booking URL must be a valid http/https link");
      return;
    }

    setSaving(true);
    try {
      await db.saveBookingSettings({
        ...settings,
        bookingUrl: (settings.bookingUrl ?? "").trim(),
        ctaLabel: (settings.ctaLabel ?? "").trim() || DEFAULT_SETTINGS.ctaLabel,
        providerId: (settings.providerId ?? DEFAULT_SETTINGS.providerId) as any,
        openInNewTab: !!settings.openInNewTab,
      });

      toast.success("Booking settings saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ? String(e.message) : "Failed to save booking settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-medium text-charcoal">Bookings Configuration</h1>
        <div className="flex items-center space-x-2">
          <Switch checked={!!settings.openInNewTab} onCheckedChange={(c) => setSettings((p) => ({ ...p, openInNewTab: c }))} />
          <Label>Open in new tab</Label>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-sm space-y-6">
        <div className="space-y-2">
          <Label>Booking Provider</Label>

          <Select value={settings.providerId ?? DEFAULT_SETTINGS.providerId} onValueChange={(val: any) => setSettings((p) => ({ ...p, providerId: val }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="booksy">Booksy</SelectItem>
              <SelectItem value="fresha">Fresha</SelectItem>
              <SelectItem value="calendly">Calendly</SelectItem>
              <SelectItem value="custom">Custom URL</SelectItem>
            </SelectContent>
          </Select>

          <p className="text-xs text-gray-500">Select the third-party provider you use for salon appointments.</p>
        </div>

        <div className="space-y-2">
          <Label>Booking URL</Label>
          <Input
            value={settings.bookingUrl ?? ""}
            onChange={(e) => setSettings((p) => ({ ...p, bookingUrl: e.target.value }))}
            placeholder="https://structurahair.booksy.com"
            className="font-mono text-sm"
          />
          {!isValidUrl && <p className="text-xs text-red-600">Please enter a valid http/https URL.</p>}
        </div>

        <div className="space-y-2">
          <Label>Default CTA Label</Label>
          <Input value={settings.ctaLabel ?? ""} onChange={(e) => setSettings((p) => ({ ...p, ctaLabel: e.target.value }))} placeholder="Book Now" />
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="w-full bg-charcoal text-white hover:bg-black disabled:opacity-60">
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
}