import React, { useEffect, useMemo, useState } from "react";
import { db, BookingSettings } from "../../../../lib/db";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";
import { Save, ExternalLink } from "lucide-react";
import { Switch } from "../../../components/ui/switch";

const DEFAULT_SETTINGS: BookingSettings = {
  providerId: "booksy",
  bookingUrl: "",
  ctaLabel: "Book Now",
  openInNewTab: true,
};

export default function BookingSettingsPage() {
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
    if (!raw) return true; // allow empty while editing
    try {
      const u = new URL(raw);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, [settings.bookingUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

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
      toast.success("Booking settings updated");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ? String(error.message) : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-display mb-2">Booking Settings</h1>
      <p className="text-gray-500 mb-8">Configure how booking buttons behave across the entire site.</p>

      <div className="bg-white p-8 border border-gray-200 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-blue-50 border border-blue-100 p-4 flex gap-4 text-blue-800 text-sm">
            <div className="shrink-0 mt-0.5">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold mb-1">Global Redirection Active</p>
              <p>
                All "Book Now", "Appointment", and "Make a Booking" buttons on the website will redirect users to the URL
                configured below.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Provider</Label>
              <select
                className="w-full p-3 border border-gray-300 rounded bg-gray-50"
                value={settings.providerId ?? DEFAULT_SETTINGS.providerId}
                onChange={(e) => setSettings((prev) => ({ ...prev, providerId: e.target.value as any }))}
              >
                <option value="booksy">Booksy (Recommended)</option>
                <option value="fresha">Fresha</option>
                <option value="calendly">Calendly</option>
                <option value="custom">Custom URL</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Booking URL</Label>
              <Input
                value={settings.bookingUrl ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, bookingUrl: e.target.value }))}
                placeholder="https://structurahair.booksy.com"
                className="font-mono text-sm"
              />
              {!isValidUrl && <p className="text-xs text-red-600">Please enter a valid http/https URL.</p>}
              {isValidUrl && <p className="text-xs text-gray-500">The full URL where customers will be sent.</p>}
            </div>

            <div className="space-y-2">
              <Label>Default CTA Label</Label>
              <Input
                value={settings.ctaLabel ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                placeholder="Book Now"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={!!settings.openInNewTab}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, openInNewTab: checked }))}
              />
              <Label>Open in new tab</Label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <Button type="submit" disabled={saving} className="bg-charcoal text-white h-12 px-6 disabled:opacity-60">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}