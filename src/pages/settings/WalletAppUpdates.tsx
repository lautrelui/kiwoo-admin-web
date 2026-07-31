import { FormEvent, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormInput, FormTextarea } from "@/components/ui/FormInput";
import { apiErrorMessage } from "@/lib/api";
import { walletUpdateService } from "@/services/walletUpdateService";
import { DEFAULT_DOWNLOAD_URL } from "@/types/walletUpdate";
import type { WalletUpdateConfig } from "@/types/walletUpdate";

interface FormState {
  update_enabled: boolean;
  latest_version: string;
  latest_build_number: string;
  download_url: string;
  release_notes: string;
  published_at: string;
}

const EMPTY: FormState = {
  update_enabled: true,
  latest_version: "",
  latest_build_number: "",
  download_url: DEFAULT_DOWNLOAD_URL,
  release_notes: "",
  published_at: "",
};

/** HTTPS-only, real host — rejects javascript:/data:/file:/http. */
function isSafeHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !!u.hostname;
  } catch {
    return false;
  }
}

const SEMVER = /^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/;

/**
 * Mirrors the backend's config-consistency rules (backend stays authoritative):
 * pair-required when enabled, and a monotonic published build number.
 */
function validate(f: FormState, baseline: WalletUpdateConfig | null): Record<string, string> {
  const e: Record<string, string> = {};

  const version = f.latest_version.trim();
  if (version && !SEMVER.test(version)) {
    e.latest_version = "Use a semantic version like 1.3.1.";
  }

  const build = f.latest_build_number.trim();
  let buildNum: number | null = null;
  if (build) {
    const n = Number(build);
    if (!Number.isInteger(n) || n <= 0) {
      e.latest_build_number = "Enter a positive whole number.";
    } else {
      buildNum = n;
    }
  }

  const url = f.download_url.trim();
  if (!url) {
    e.download_url = "A download URL is required.";
  } else if (!isSafeHttpsUrl(url)) {
    e.download_url = "Must be a valid HTTPS URL (no javascript:, data: or file:).";
  }

  const published = f.published_at.trim();
  if (published && Number.isNaN(Date.parse(published))) {
    e.published_at = "Enter a valid ISO-8601 date/time, or leave blank.";
  }

  // Pair required when enabled — never prompt from a half-configured row.
  if (f.update_enabled) {
    if (!version) e.latest_version = "Required when update checks are enabled.";
    if (!build) e.latest_build_number = "Required when update checks are enabled.";
  }

  // Monotonic build vs the currently published config.
  const prevBuild = baseline?.latest_build_number ?? null;
  if (buildNum != null && prevBuild != null && !e.latest_build_number) {
    if (buildNum < prevBuild) {
      e.latest_build_number = `Cannot be lower than the published build (${prevBuild}).`;
    } else if (buildNum === prevBuild && version !== (baseline?.latest_version ?? "")) {
      e.latest_build_number = `Build ${prevBuild} is already published for ${baseline?.latest_version ?? "n/a"}; use a greater build to publish a different version.`;
    }
  }

  return e;
}

export default function WalletAppUpdates() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [baseline, setBaseline] = useState<WalletUpdateConfig | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function refresh() {
    setLoading(true);
    setBanner(null);
    try {
      const cfg = await walletUpdateService.getConfig();
      setBaseline(cfg);
      if (cfg) {
        setForm({
          update_enabled: cfg.update_enabled,
          latest_version: cfg.latest_version ?? "",
          latest_build_number: cfg.latest_build_number != null ? String(cfg.latest_build_number) : "",
          download_url: cfg.download_url || DEFAULT_DOWNLOAD_URL,
          release_notes: cfg.release_notes ?? "",
          published_at: cfg.published_at ?? "",
        });
      } else {
        setForm(EMPTY); // never configured → safe defaults
      }
    } catch (err) {
      setBanner(apiErrorMessage(err));
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form, baseline);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setBanner(null);
    try {
      await walletUpdateService.saveConfig({
        update_enabled: form.update_enabled,
        latest_version: form.latest_version.trim() || null,
        latest_build_number: form.latest_build_number.trim()
          ? Number(form.latest_build_number.trim())
          : null,
        download_url: form.download_url.trim(),
        release_notes: form.release_notes.trim() || null,
        published_at: form.published_at.trim() || null,
      });
      setSaved(true);
      await refresh();
    } catch (err) {
      setBanner(apiErrorMessage(err));
    }
    setSaving(false);
  }

  return (
    <AppLayout
      title="Application Updates"
      subtitle="Platform Settings › Wallet Application — the optional in-app update prompt"
    >
      <div className="max-w-2xl">
        {banner && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {banner}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Wallet update configuration</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-sm text-ink-400">Loading…</p>
            ) : (
              <form className="space-y-4" onSubmit={save}>
                <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <input
                    type="checkbox"
                    name="update_enabled"
                    checked={form.update_enabled}
                    onChange={(e) => set("update_enabled", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-200"
                  />
                  Update check enabled
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Latest public version"
                    name="latest_version"
                    hint="Semantic version, e.g. 1.3.1"
                    placeholder="1.3.1"
                    value={form.latest_version}
                    error={errors.latest_version}
                    onChange={(e) => set("latest_version", e.target.value)}
                  />
                  <FormInput
                    label="Latest build number"
                    name="latest_build_number"
                    hint="Positive whole number, e.g. 33"
                    inputMode="numeric"
                    placeholder="33"
                    value={form.latest_build_number}
                    error={errors.latest_build_number}
                    onChange={(e) => set("latest_build_number", e.target.value)}
                  />
                </div>

                <FormInput
                  label="Download / update URL"
                  name="download_url"
                  hint="HTTPS only. Defaults to the public download page."
                  placeholder={DEFAULT_DOWNLOAD_URL}
                  value={form.download_url}
                  error={errors.download_url}
                  onChange={(e) => set("download_url", e.target.value)}
                />

                <FormTextarea
                  label="Release notes (optional)"
                  name="release_notes"
                  hint="Shown in the update dialog."
                  rows={3}
                  value={form.release_notes}
                  error={errors.release_notes}
                  onChange={(e) => set("release_notes", e.target.value)}
                />

                <FormInput
                  label="Published date (optional)"
                  name="published_at"
                  hint="ISO-8601, e.g. 2026-07-30T22:00:00Z"
                  placeholder="2026-07-30T22:00:00Z"
                  value={form.published_at}
                  error={errors.published_at}
                  onChange={(e) => set("published_at", e.target.value)}
                />

                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" loading={saving}>
                    Save configuration
                  </Button>
                  {saved && <span className="text-xs text-emerald-600">Saved</span>}
                </div>

                <p className="pt-2 text-xs text-ink-400">
                  Customers are never forced to update. No prompt is shown until a valid version or
                  build number is set. The endpoint the wallet reads exposes only public fields.
                </p>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
