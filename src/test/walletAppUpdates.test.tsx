import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type React from "react";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { getConfig, saveConfig } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
}));
vi.mock("@/services/walletUpdateService", () => ({
  walletUpdateService: { getConfig, saveConfig },
}));

import WalletAppUpdates from "@/pages/settings/WalletAppUpdates";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import * as AuthContext from "@/context/AuthContext";
import type { WalletUpdateConfig } from "@/types/walletUpdate";

function fx(over: Partial<WalletUpdateConfig> = {}): WalletUpdateConfig {
  return {
    id: 1,
    update_enabled: true,
    latest_version: "1.3.1",
    latest_build_number: 33,
    download_url: "https://wallet.kiwoo.io/download",
    release_notes: "Performance and stability improvements.",
    published_at: null,
    updated_by_admin_id: 7,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-30T22:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  getConfig.mockReset();
  saveConfig.mockReset();
  saveConfig.mockResolvedValue(fx());
});

function renderPage() {
  return render(
    <MemoryRouter>
      <WalletAppUpdates />
    </MemoryRouter>,
  );
}

const saveBtn = () => screen.getByRole("button", { name: /save configuration/i });

describe("WalletAppUpdates settings page", () => {
  it("loads an existing configuration into the form", async () => {
    getConfig.mockResolvedValue(fx());
    renderPage();
    expect(await screen.findByDisplayValue("1.3.1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("33")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://wallet.kiwoo.io/download")).toBeInTheDocument();
  });

  it("shows the default download URL when never configured", async () => {
    getConfig.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByDisplayValue("https://wallet.kiwoo.io/download")).toBeInTheDocument();
  });

  it("saves a valid configuration with a cleaned payload", async () => {
    getConfig.mockResolvedValue(fx({ latest_build_number: 32 }));
    renderPage();
    await screen.findByDisplayValue("1.3.1");
    await userEvent.click(saveBtn());
    await waitFor(() => expect(saveConfig).toHaveBeenCalledTimes(1));
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        update_enabled: true,
        latest_version: "1.3.1",
        latest_build_number: 32,
        download_url: "https://wallet.kiwoo.io/download",
      }),
    );
  });

  it("rejects a non-HTTPS URL and does not save", async () => {
    getConfig.mockResolvedValue(fx());
    renderPage();
    const url = await screen.findByLabelText("Download / update URL");
    await userEvent.clear(url);
    await userEvent.type(url, "http://wallet.kiwoo.io/download");
    await userEvent.click(saveBtn());
    expect(await screen.findByText(/must be a valid HTTPS URL/i)).toBeInTheDocument();
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it("rejects an invalid version and does not save", async () => {
    getConfig.mockResolvedValue(fx());
    renderPage();
    const version = await screen.findByLabelText("Latest public version");
    await userEvent.clear(version);
    await userEvent.type(version, "abc");
    await userEvent.click(saveBtn());
    expect(await screen.findByText(/semantic version/i)).toBeInTheDocument();
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it("can disable update checking", async () => {
    getConfig.mockResolvedValue(fx());
    renderPage();
    await screen.findByDisplayValue("1.3.1");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(saveBtn());
    await waitFor(() => expect(saveConfig).toHaveBeenCalledTimes(1));
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ update_enabled: false }),
    );
  });

  it("is RBAC-gated: a non-admin is redirected away", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      hasRole: () => false,
      user: { id: 1, role: "VIEWER" },
      token: "t",
    } as unknown as ReturnType<typeof AuthContext.useAuth>);
    getConfig.mockResolvedValue(fx());
    render(
      <MemoryRouter initialEntries={["/settings/wallet/application-updates"]}>
        <Routes>
          <Route
            path="/settings/wallet/application-updates"
            element={
              <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
                <WalletAppUpdates />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>home-redirect</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("home-redirect")).toBeInTheDocument();
    expect(screen.queryByText("Wallet update configuration")).not.toBeInTheDocument();
  });
});
