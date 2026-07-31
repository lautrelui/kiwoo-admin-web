/** Wallet Application Update config — admin view (mirrors the backend model). */
export interface WalletUpdateConfig {
  id: number;
  update_enabled: boolean;
  latest_version: string | null;
  latest_build_number: number | null;
  download_url: string;
  release_notes: string | null;
  published_at: string | null;
  updated_by_admin_id: number | null;
  created_at: string;
  updated_at: string;
}

/** The write payload (PUT /admin/wallet/app-update). */
export interface WalletUpdateConfigInput {
  update_enabled: boolean;
  latest_version: string | null;
  latest_build_number: number | null;
  download_url: string;
  release_notes: string | null;
  published_at: string | null;
}

export const DEFAULT_DOWNLOAD_URL = "https://wallet.kiwoo.io/download";
