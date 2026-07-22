import { api } from "@/lib/api";
import type { ReserveReport, TreasuryStatus } from "@/types";

export interface MintPayload {
  amount: number;
  destination?: string;
  memo?: string;
}

export interface BurnPayload {
  amount: number;
  source?: string;
  memo?: string;
}

export interface FreezePayload {
  walletAddress: string;
  reason?: string;
}

export interface DisbursePayload {
  user_id?: number;
  phone?: string;
  amount: number;
  reason?: string;
  idempotency_key: string;
}

export interface DisburseResult {
  user_id: number;
  amount: string;
  asset_code: string;
  stellar_tx_hash: string | null;
  journal_id: number;
  execution_id: string;
  idempotent_replay?: boolean;
}

// Backend uses snake_case; this layer normalizes to the camelCase shape the
// admin UI was built against.
type RawStatus = {
  asset_code: string;
  issuer_public_key: string | null;
  distribution_public_key: string | null;
  network?: string;
  circulating_supply_cache?: number | string;
  reserve_balance_cache?: number | string;
  last_refreshed_at?: string | null;
};

type RawCirculatingSupply = {
  asset_code: string;
  total_issued?: number | string;
  reserve_balance?: number | string;
  circulating_supply: number | string;
  source?: string;
  note?: string;
  error?: string;
};

type RawReserveReport = {
  asset_code: string;
  distribution_account: string | null;
  reserve_balance: number | string;
  circulating_supply_cache?: number | string;
  backing_ratio_note?: string;
};

const num = (v: number | string | undefined | null): number =>
  v == null ? 0 : typeof v === "number" ? v : parseFloat(v) || 0;

export const treasuryService = {
  // `/treasury/status` returns only the cached supply/reserve; the live
  // numbers come from `/treasury/circulating-supply` (which also refreshes
  // the cache as a side-effect). Merge both so the UI always sees fresh data.
  async status(): Promise<TreasuryStatus> {
    const [rawStatus, rawSupply] = await Promise.all([
      api.get<RawStatus>("treasury/status").then((r) => r.data),
      api
        .get<RawCirculatingSupply>("treasury/circulating-supply")
        .then((r) => r.data)
        .catch(() => null),
    ]);
    const circulating = rawSupply
      ? num(rawSupply.circulating_supply)
      : num(rawStatus.circulating_supply_cache);
    const reserve = rawSupply?.reserve_balance != null
      ? num(rawSupply.reserve_balance)
      : num(rawStatus.reserve_balance_cache);
    return {
      assetCode: rawStatus.asset_code,
      issuerPublicKey: rawStatus.issuer_public_key ?? undefined,
      distributionPublicKey: rawStatus.distribution_public_key ?? undefined,
      circulatingSupply: circulating,
      reserveBalance: reserve,
      // Backing ratio is reserve / circulating supply. The backend's note
      // calls out that the "real" backing ratio uses off-chain HTG reserves
      // which are not tracked in this service yet — surface the on-chain
      // distribution-to-circulating ratio as a proxy so the UI shows
      // *something* until off-chain reserves are wired up.
      backingRatio: circulating > 0 ? reserve / circulating : undefined,
      network: rawStatus.network,
      lastUpdated: rawStatus.last_refreshed_at ?? undefined,
    };
  },
  async circulatingSupply() {
    const { data } = await api.get<RawCirculatingSupply>("treasury/circulating-supply");
    return data;
  },
  async reserveReport(): Promise<ReserveReport> {
    const { data } = await api.get<RawReserveReport>("treasury/reserve-report");
    const entries: ReserveReport["entries"] = [];
    if (data.distribution_account) {
      entries.push({
        account: data.distribution_account,
        label: "Distribution account",
        balance: num(data.reserve_balance),
        currency: data.asset_code,
      });
    }
    return {
      total: num(data.reserve_balance),
      entries,
    };
  },
  async mint(payload: MintPayload) {
    const { data } = await api.post("treasury/mint", payload);
    return data;
  },
  // Ledger-authoritative user disbursement (funds ledger USER:<id> + on-chain).
  // Idempotent on idempotency_key; may return confirmed OR a reconciliation
  // conflict (409). Callers surface the state machine, never blind-retry.
  async disburse(payload: DisbursePayload): Promise<DisburseResult> {
    const { data } = await api.post<DisburseResult>("treasury/disburse", payload);
    return data;
  },
  async burn(payload: BurnPayload) {
    const { data } = await api.post("treasury/burn", payload);
    return data;
  },
  async freezeWallet(payload: FreezePayload) {
    const { data } = await api.post("treasury/freeze-wallet", payload);
    return data;
  },
  async unfreezeWallet(payload: FreezePayload) {
    const { data } = await api.post("treasury/unfreeze-wallet", payload);
    return data;
  },
};
