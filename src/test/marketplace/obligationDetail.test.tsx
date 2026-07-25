import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Isolate the page from the app chrome (Sidebar/Topbar → AuthContext).
vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

// Mock the participant service; keep a real-ish error mapper. (vi.hoisted → factory-safe.)
const { getObligation, evidenceTrail, confirmHandover, validateCode, receipt } = vi.hoisted(() => ({
  getObligation: vi.fn(),
  evidenceTrail: vi.fn(),
  confirmHandover: vi.fn(),
  validateCode: vi.fn(),
  receipt: vi.fn(),
}));
vi.mock("@/services/marketplaceParticipantService", () => ({
  marketplaceParticipantService: { getObligation, evidenceTrail, confirmHandover, validateCode, receipt, openDispute: vi.fn(), rejectObligation: vi.fn(), acceptObligation: vi.fn() },
  marketplaceError: (e: { response?: { status?: number; data?: { message?: string[] } }; message?: string }) => ({
    status: e?.response?.status ?? null,
    code: e?.response?.data?.message?.[0] ?? e?.message ?? "",
    message: e?.response?.data?.message?.[0] ?? e?.message ?? "error",
  }),
}));

import ObligationDetail from "@/pages/marketplace/ObligationDetail";

function renderAt(ref: string) {
  return render(
    <MemoryRouter initialEntries={[`/participant/marketplace/obligations/${ref}`]}>
      <Routes>
        <Route path="/participant/marketplace/obligations/:ref" element={<ObligationDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

const verified = (amount: string) => ({
  fulfilment_ref: "MFL-1",
  customer_ref: "OPmt-1",
  payout_amount: amount,
  participant_compensation: "3",
  currency_hint: "HTG",
  state: "COLLECTION_CREDENTIAL_VERIFIED",
  acceptance_deadline: null,
  collection_deadline: "2999-01-01T00:00:00Z",
  qr_token: null,
});

beforeEach(() => {
  getObligation.mockReset();
  evidenceTrail.mockReset().mockResolvedValue([]);
  confirmHandover.mockReset().mockResolvedValue({ status: "handover_confirmed" });
  validateCode.mockReset().mockResolvedValue({ status: "collection_verified" });
  receipt.mockReset();
});

describe("credential validation and handover are SEPARATE", () => {
  it("READY state shows credential input, NOT a handover button", async () => {
    getObligation.mockResolvedValue({ ...verified("100"), state: "READY_FOR_COLLECTION" });
    renderAt("MFL-1");
    // Credential input present (its labelled field), handover button absent → the two are separate.
    await screen.findByLabelText(/Collection code/i);
    expect(screen.getByRole("button", { name: /Validate credential/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm cash handover/i })).not.toBeInTheDocument();
  });

  it("VERIFIED state shows a handover button, NOT the credential input", async () => {
    getObligation.mockResolvedValue(verified("100"));
    renderAt("MFL-1");
    await screen.findByRole("button", { name: /Confirm cash handover/i });
    expect(screen.queryByRole("button", { name: /Validate credential/i })).not.toBeInTheDocument();
  });
});

describe("FORCED refresh before handover", () => {
  it("blocks the handover dialog when the amount changed on refresh (stale state)", async () => {
    getObligation.mockResolvedValueOnce(verified("100")); // initial load
    getObligation.mockResolvedValueOnce(verified("200")); // forced refresh → amount changed
    renderAt("MFL-1");
    const btn = await screen.findByRole("button", { name: /Confirm cash handover/i });
    await userEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/amount changed since you loaded/i)).toBeInTheDocument());
    // The confirmation dialog (with the checkbox) must NOT have opened.
    expect(screen.queryByText(/I confirm that I physically handed/i)).not.toBeInTheDocument();
    expect(confirmHandover).not.toHaveBeenCalled();
  });

  it("opens the dialog on a clean refresh; requires the explicit second confirmation checkbox", async () => {
    getObligation.mockResolvedValue(verified("100")); // load + refresh both 100
    renderAt("MFL-1");
    const btn = await screen.findByRole("button", { name: /Confirm cash handover/i });
    await userEvent.click(btn);
    const dialogConfirm = await screen.findByRole("button", { name: /Confirm handover/i });
    // Disabled until the checkbox is ticked.
    expect(dialogConfirm).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(dialogConfirm).toBeEnabled();
    await userEvent.click(dialogConfirm);
    await waitFor(() => expect(confirmHandover).toHaveBeenCalledWith("MFL-1"));
  });
});

describe("feature gate", () => {
  it("503 on load → deliberate unavailable state, no crash", async () => {
    getObligation.mockRejectedValue({ response: { status: 503, data: { message: ["marketplace_participant_disabled"] } } });
    renderAt("MFL-1");
    await screen.findByText(/temporarily unavailable/i);
    expect(screen.queryByRole("button", { name: /Confirm cash handover/i })).not.toBeInTheDocument();
  });
});
