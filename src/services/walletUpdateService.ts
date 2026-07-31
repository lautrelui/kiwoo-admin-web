import { api } from "@/lib/api";
import type { WalletUpdateConfig, WalletUpdateConfigInput } from "@/types/walletUpdate";

// Kiwoo's successWrapper nests the payload under `data`. Unwrap defensively.
function unwrap<T>(body: any): T {
  return (body?.data ?? body) as T;
}

const BASE = "admin/wallet/app-update";

export const walletUpdateService = {
  /** Current config, or null when never configured. */
  async getConfig(): Promise<WalletUpdateConfig | null> {
    const { data } = await api.get(BASE);
    return unwrap<WalletUpdateConfig | null>(data);
  },

  /** Upsert the singleton config (audited server-side). */
  async saveConfig(input: WalletUpdateConfigInput): Promise<WalletUpdateConfig> {
    const { data } = await api.put(BASE, input);
    return unwrap<WalletUpdateConfig>(data);
  },
};
