import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import {
  FilterBar,
  FilterField,
  FilterInput,
  FilterSelect,
} from "@/components/ops/FilterBar";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { userService } from "@/services/userService";
import type { AdminUserSummary } from "@/types/intelligence";

/**
 * Cross-user directory for the Operations Center.
 *
 * Backend guarantees a sanitized payload — this component just
 * renders what's returned. It never asks for a PIN, private key,
 * password hash, or Stripe customer id.
 */
export default function PlatformUsers() {
  const [rows, setRows] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [role, setRole] = useState("");
  const [kycTier, setKycTier] = useState("");
  const [isFrozen, setIsFrozen] = useState<string>("");
  const [hasWallet, setHasWallet] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.list({
        q: q || undefined,
        role: role || undefined,
        kyc_tier: kycTier || undefined,
        is_frozen:
          isFrozen === "true"
            ? true
            : isFrozen === "false"
              ? false
              : undefined,
        has_wallet:
          hasWallet === "true"
            ? true
            : hasWallet === "false"
              ? false
              : undefined,
        page,
        limit,
      });
      setRows(data.users);
      setTotal(data.total);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [q, role, kycTier, isFrozen, hasWallet, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AppLayout>
      <RefreshBar
        title="Platform Users"
        subtitle={`${total.toLocaleString()} accounts on Kiwoo`}
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <FilterBar className="mt-4">
        <FilterField label="Search" className="min-w-[220px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQ(qInput.trim());
            }}
          >
            <FilterInput
              placeholder="name, email, phone"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </form>
        </FilterField>
        <FilterField label="Role">
          <FilterSelect
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
          >
            <option value="">Any</option>
            <option value="client">client</option>
            <option value="agent">agent</option>
            <option value="merchant">merchant</option>
            <option value="partner">partner</option>
            <option value="admin">admin</option>
            <option value="superAdmin">superAdmin</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="KYC Tier">
          <FilterSelect
            value={kycTier}
            onChange={(e) => {
              setPage(1);
              setKycTier(e.target.value);
            }}
          >
            <option value="">Any</option>
            <option value="TIER_0_PHONE_ONLY">TIER_0</option>
            <option value="TIER_1_ID_UPLOADED">TIER_1</option>
            <option value="TIER_2_ID_VERIFIED">TIER_2</option>
            <option value="TIER_3_ADDRESS_VERIFIED">TIER_3</option>
            <option value="TIER_4_ENHANCED_DUE_DILIGENCE">TIER_4</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Frozen">
          <FilterSelect
            value={isFrozen}
            onChange={(e) => {
              setPage(1);
              setIsFrozen(e.target.value);
            }}
          >
            <option value="">Any</option>
            <option value="false">Not frozen</option>
            <option value="true">Frozen</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Wallet">
          <FilterSelect
            value={hasWallet}
            onChange={(e) => {
              setPage(1);
              setHasWallet(e.target.value);
            }}
          >
            <option value="">Any</option>
            <option value="true">Provisioned</option>
            <option value="false">None</option>
          </FilterSelect>
        </FilterField>
      </FilterBar>

      <ErrorNote error={error} className="mt-4" />

      <div className="mt-4">
        <DataTable
          columns={[
            {
              key: "id",
              header: "ID",
              width: "5rem",
              render: (r) => (
                <Link
                  to={`/ops/users/${r.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  #{r.id}
                </Link>
              ),
            },
            {
              key: "name",
              header: "Name",
              render: (r) => <span className="text-ink-900">{r.name}</span>,
            },
            {
              key: "phone",
              header: "Phone",
              render: (r) => (
                <span className="font-mono text-xs text-ink-700">
                  {r.phone}
                </span>
              ),
            },
            {
              key: "email",
              header: "Email",
              render: (r) => (
                <span className="text-xs text-ink-700">{r.email}</span>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (r) => <Chip tone="info">{r.role}</Chip>,
            },
            {
              key: "kyc_tier",
              header: "KYC",
              render: (r) => (
                <Chip
                  tone={
                    r.kyc_tier === "TIER_0_PHONE_ONLY"
                      ? "muted"
                      : r.kyc_tier === "TIER_4_ENHANCED_DUE_DILIGENCE"
                        ? "success"
                        : "brand"
                  }
                >
                  {r.kyc_tier.replace("TIER_", "T").split("_")[0]}
                </Chip>
              ),
            },
            {
              key: "flags",
              header: "Flags",
              render: (r) => (
                <div className="flex gap-1">
                  {r.is_frozen && <Chip tone="danger">frozen</Chip>}
                  {r.has_wallet ? (
                    <Chip tone="success">wallet</Chip>
                  ) : (
                    <Chip tone="muted">no wallet</Chip>
                  )}
                </div>
              ),
            },
            {
              key: "created_at",
              header: "Created",
              render: (r) => (
                <span className="text-xs text-ink-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              ),
            },
          ]}
          rows={rows}
          loading={loading}
          emptyMessage="No users match those filters."
          rowKey={(r) => r.id}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
        <span>
          Page {page} of {totalPages} · {rows.length} of {total.toLocaleString()}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
