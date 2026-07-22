import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { intelligenceService } from "@/services/intelligenceService";
import type {
  ContractValidationResponse,
  ProductContractSummary,
} from "@/types/intelligence";

/**
 * Product Registry — contract-driven since Task 131.
 *
 * Reads `/admin/intelligence/products` (declared registry) instead
 * of deriving Products from observed events. This means placeholder
 * Products like Lottery and Sòl appear before they emit a single
 * event, and any Product that stops emitting doesn't fall off the
 * page.
 *
 * A separate strip surfaces the ContractValidator's registry errors
 * and recent runtime violations so operators know if a bad contract
 * PR slipped past code review.
 */

function statusTone(status: string): "success" | "info" | "warning" | "muted" | "danger" {
  switch (status) {
    case "production":
      return "success";
    case "beta":
      return "info";
    case "coming_soon":
      return "warning";
    case "concept":
      return "muted";
    case "disabled":
      return "danger";
    default:
      return "muted";
  }
}

export default function ProductRegistry() {
  const [products, setProducts] = useState<ProductContractSummary[]>([]);
  const [validation, setValidation] = useState<ContractValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      intelligenceService.listProducts(),
      intelligenceService.getContractValidation(),
    ]);
    if (results[0].status === "fulfilled") {
      setProducts(results[0].value.products);
    } else {
      setError(results[0].reason);
    }
    if (results[1].status === "fulfilled") {
      setValidation(results[1].value);
    }
    setLoading(false);
    setRefreshedAt(new Date());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalEvents = products.reduce(
    (n, p) => n + p.events_published_count,
    0,
  );
  const totalProduction = products.filter(
    (p) => p.status === "production",
  ).length;

  return (
    <AppLayout>
      <RefreshBar
        title="Product Registry"
        subtitle={`${products.length} Products declared · ${totalProduction} in production · ${totalEvents} events`}
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={error} className="mt-4" />

      {validation && (validation.registry_errors.length > 0 ||
        validation.recent_violations.length > 0) && (
        <Card className="mt-4 border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            Contract validator alerts
          </h2>
          {validation.registry_errors.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Registry errors ({validation.registry_errors.length})
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-900">
                {validation.registry_errors.slice(0, 20).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.recent_violations.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Recent violations ({validation.recent_violations.length})
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-900">
                {validation.recent_violations.slice(0, 10).map((v, i) => (
                  <li key={i}>
                    <span className="font-mono">{v.kind}</span> ·{" "}
                    {v.product}/{v.event_name} — {v.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card className="mt-4 p-4">
        <p className="mb-3 text-xs text-ink-500">
          Declared by ProductContract files under
          <code className="rounded bg-ink-100 px-1 mx-1 text-[11px]">
            src/intelligence/contracts/products/
          </code>
          . Changes ship in code, not runtime configuration.
        </p>
        <DataTable
          columns={[
            {
              key: "product",
              header: "Product",
              render: (r) => (
                <div>
                  <div className="font-medium text-ink-900">
                    {r.display_name}
                  </div>
                  <Link
                    to={`/ops/events?product=${encodeURIComponent(r.product_id)}`}
                    className="text-xs font-mono text-brand-700 hover:underline"
                  >
                    {r.product_id}
                  </Link>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <Chip tone={statusTone(r.status)}>{r.status}</Chip>
              ),
            },
            {
              key: "category",
              header: "Category",
              render: (r) => <Chip tone="info">{r.category}</Chip>,
            },
            {
              key: "events",
              header: "Declared events",
              render: (r) => (
                <div className="flex max-w-lg flex-wrap gap-1">
                  {r.event_names.length === 0 ? (
                    <Chip tone="muted">none</Chip>
                  ) : (
                    r.event_names.slice(0, 5).map((n) => (
                      <Chip key={n} tone="brand">
                        {n}
                      </Chip>
                    ))
                  )}
                  {r.event_names.length > 5 && (
                    <Chip tone="muted">
                      +{r.event_names.length - 5} more
                    </Chip>
                  )}
                </div>
              ),
            },
            {
              key: "kyc",
              header: "KYC",
              render: (r) => (
                <span className="text-xs text-ink-700">
                  {r.kyc_minimum_tier.replace("TIER_", "T").split("_")[0]}
                </span>
              ),
            },
            {
              key: "fee",
              header: "Fee",
              render: (r) => (
                <Chip
                  tone={r.fee_model === "none" ? "muted" : "info"}
                >
                  {r.fee_model}
                </Chip>
              ),
            },
            {
              key: "retention",
              header: "Retention",
              render: (r) => (
                <span className="text-xs font-mono text-ink-700">
                  {r.retention_hot}
                </span>
              ),
            },
            {
              key: "team",
              header: "Owner team",
              render: (r) => (
                <span className="text-xs text-ink-600">{r.owner_team}</span>
              ),
            },
          ]}
          rows={products}
          loading={loading}
          emptyMessage="No ProductContracts declared."
          rowKey={(r) => r.product_id}
        />
      </Card>
    </AppLayout>
  );
}
