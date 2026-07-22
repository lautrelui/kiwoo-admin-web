import { FormEvent, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";
import { getStoredBaseUrl, setStoredBaseUrl } from "@/lib/api";

export default function Settings() {
  const [baseUrl, setBaseUrl] = useState(getStoredBaseUrl());
  const [saved, setSaved] = useState(false);

  function save(e: FormEvent) {
    e.preventDefault();
    setStoredBaseUrl(baseUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppLayout title="Settings" subtitle="Local console preferences">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API base URL</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="space-y-3" onSubmit={save}>
              <FormInput
                label="Backend URL"
                hint="Stored in this browser only. Defaults to VITE_API_BASE_URL."
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:3000/"
              />
              <div className="flex items-center gap-3">
                <Button type="submit">Save</Button>
                {saved && <span className="text-xs text-emerald-600">Saved</span>}
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-ink-400">Environment</dt>
                <dd className="mt-0.5 font-medium text-ink-900">
                  {import.meta.env.VITE_ENV_LABEL || "development"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-ink-400">Asset code</dt>
                <dd className="mt-0.5 font-medium text-ink-900">
                  {import.meta.env.VITE_ASSET_CODE || "HTGe"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-ink-400">Build mode</dt>
                <dd className="mt-0.5 font-medium text-ink-900">{import.meta.env.MODE}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-ink-400">Default API URL</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-ink-700">
                  {import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/"}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
