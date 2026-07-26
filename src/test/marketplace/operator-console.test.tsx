import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const { reviews, caseContext, preview, propose, approve, addNote, reject } = vi.hoisted(() => ({
  reviews: vi.fn(), caseContext: vi.fn(), preview: vi.fn(), propose: vi.fn(), approve: vi.fn(), addNote: vi.fn(), reject: vi.fn(),
}));
vi.mock("@/services/marketplaceOperatorService", () => ({
  marketplaceOperatorService: { reviews, caseContext, preview, propose, approve, addNote, reject },
  marketplaceError: (e: { response?: { status?: number; data?: { message?: string[] } }; message?: string }) => ({
    status: e?.response?.status ?? null, code: e?.response?.data?.message?.[0] ?? e?.message ?? "", message: e?.response?.data?.message?.[0] ?? e?.message ?? "error",
  }),
}));

import ReviewQueue from "@/pages/marketplace/operator/ReviewQueue";
import CaseDetail from "@/pages/marketplace/operator/CaseDetail";
import { parseCaseContext, parseQueue } from "@/types/marketplaceOperator";
import { ageText, fourEyesTone, reviewReasonLabel } from "@/lib/marketplaceOperator";
import { fxCase, fxCaseAdjudicated, fxCasePending, fxPreviewCompensateProhibited, fxPreviewSettle, fxQueue } from "@/lib/marketplaceOperatorFixtures";

const FORBIDDEN = ["collection_code_hash", "qr_token", "settlement_journal_id", "reservation_journal_id", "device_ref_hash", "session_ref_hash", "$argon2", "matching_policy_id", "adjudicated_by"];

function renderCase() {
  return render(
    <MemoryRouter initialEntries={["/operator/marketplace/case/MFL-op-1"]}>
      <Routes><Route path="/operator/marketplace/case/:ref" element={<CaseDetail />} /></Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  [reviews, caseContext, preview, propose, approve, addNote, reject].forEach((m) => m.mockReset());
});

describe("unit + privacy", () => {
  it("parsers guarantee arrays; helpers map safely", () => {
    const c = parseCaseContext({});
    expect(Array.isArray(c.timeline)).toBe(true);
    expect(Array.isArray(c.notes)).toBe(true);
    expect(c.four_eyes.status).toBe("SECOND_APPROVAL_REQUIRED");
    expect(parseQueue(undefined).items).toEqual([]);
    expect(reviewReasonLabel("DISPUTE")).toBe("Party dispute");
    expect(fourEyesTone("APPROVED")).toBe("good");
    expect(ageText(3600)).toBe("1h 0m");
  });
  it("operator fixtures carry no forbidden fields", () => {
    for (const fx of [fxCase, fxCasePending, fxCaseAdjudicated, fxQueue]) {
      const json = JSON.stringify(fx);
      for (const f of FORBIDDEN) expect(json).not.toContain(f);
    }
  });
});

describe("ReviewQueue", () => {
  it("renders rows from the queue", async () => {
    reviews.mockResolvedValue(fxQueue);
    render(<MemoryRouter><ReviewQueue preset="all" /></MemoryRouter>);
    await screen.findByText("MFL-op-1");
    expect(screen.getByText("Agent Pétionville")).toBeInTheDocument();
  });
  it("503 → deliberate feature-disabled state", async () => {
    reviews.mockRejectedValue({ response: { status: 503, data: { message: ["marketplace_operator_disabled"] } } });
    render(<MemoryRouter><ReviewQueue preset="all" /></MemoryRouter>);
    await screen.findByText(/temporarily unavailable/i);
  });
});

describe("CaseDetail", () => {
  it("renders the quote snapshot (103 entitlement), TEST notice, and four-eyes policy", async () => {
    caseContext.mockResolvedValue(fxCase);
    renderCase();
    await screen.findByText("Immutable quote snapshot");
    expect(screen.getByText("103 HTG")).toBeInTheDocument();
    expect(screen.getByRole("note", { name: "Test transaction notice" })).toBeInTheDocument();
    expect(screen.getByText(/Second approval required/i)).toBeInTheDocument();
  });

  it("pending proposal → shows maker-cannot-approve note + an Approve action", async () => {
    caseContext.mockResolvedValue(fxCasePending);
    renderCase();
    await screen.findByText(/maker cannot approve their own proposal/i);
    expect(screen.getByRole("button", { name: /Review \+ approve/i })).toBeInTheDocument();
  });

  it("adjudicated case → read-only outcome, no propose controls", async () => {
    caseContext.mockResolvedValue(fxCaseAdjudicated);
    renderCase();
    await screen.findByText("Final outcome");
    expect(screen.getByText(/This case is terminal/i)).toBeInTheDocument();
    expect(screen.queryByText(/Preview impact/i)).not.toBeInTheDocument();
  });

  it("propose requires a preview + the explicit final-confirmation checkbox before it fires", async () => {
    caseContext.mockResolvedValue(fxCase);
    preview.mockResolvedValue(fxPreviewSettle);
    propose.mockResolvedValue({ status: "second_approval_required", proposal_id: "P1", four_eyes: "SECOND_APPROVAL_PENDING" });
    renderCase();
    await screen.findByText("Adjudication (four-eyes)");

    // Preview disabled until a note is entered.
    await userEvent.type(screen.getByLabelText(/Operator note/i), "reviewed evidence");
    await userEvent.click(screen.getByRole("button", { name: /Preview impact/i }));
    await waitFor(() => expect(preview).toHaveBeenCalledWith("MFL-op-1", "SETTLE"));

    const dialog = await screen.findByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: /Propose decision/i });
    expect(confirmBtn).toBeDisabled(); // needs the final-confirmation checkbox
    await userEvent.click(within(dialog).getByRole("checkbox"));
    expect(confirmBtn).toBeEnabled();
    await userEvent.click(confirmBtn);
    await waitFor(() => expect(propose).toHaveBeenCalledWith("MFL-op-1", { decision: "SETTLE", reason: expect.any(String), note: "reviewed evidence" }));
  });

  it("COMPENSATE preview surfaces the backend prohibition after handover", async () => {
    caseContext.mockResolvedValue(fxCase);
    preview.mockResolvedValue(fxPreviewCompensateProhibited);
    renderCase();
    await screen.findByText("Adjudication (four-eyes)");
    await userEvent.selectOptions(screen.getByLabelText(/^Decision/i), "COMPENSATE");
    await userEvent.type(screen.getByLabelText(/Operator note/i), "considering compensation");
    await userEvent.click(screen.getByRole("button", { name: /Preview impact/i }));
    await screen.findByText(/compensation prohibited/i);
  });
});
