import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { getFloat, list, policy, create, approve, execute, reject, cancel } = vi.hoisted(() => ({
  getFloat: vi.fn(), list: vi.fn(), policy: vi.fn(), create: vi.fn(), approve: vi.fn(), execute: vi.fn(), reject: vi.fn(), cancel: vi.fn(),
}));
vi.mock("@/services/agentFloatService", () => ({
  agentFloatService: { getFloat, list, policy, create, approve, execute, reject, cancel },
}));

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth }));

import { AgentFloatPanel } from "@/components/cashout-partners/AgentFloatPanel";
import type { FloatTopUp } from "@/services/agentFloatService";

function fxReq(over: Partial<FloatTopUp> = {}): FloatTopUp {
  return {
    reference: "AFT-1", agent_user_id: 28, amount: "500", asset_code: "HTGe", reason: "bootstrap",
    status: "REQUESTED", requested_by: 1, requested_at: "2026-08-02T22:00:00Z",
    approved_by: null, approved_at: null, executed_by: null, executed_at: null,
    rejected_by: null, rejected_at: null, rejection_note: null, cancelled_by: null, cancelled_at: null,
    expires_at: null, journal_ref: null, float_before: null, float_after: null, ...over,
  };
}

beforeEach(() => {
  [getFloat, list, policy, create, approve, execute, reject, cancel].forEach((m) => m.mockReset());
  getFloat.mockResolvedValue({ agent_user_id: 28, asset_code: "HTGe", float_balance: "173", max_cash_in: "173", as_of: "2026-08-02T22:00:00Z" });
  policy.mockResolvedValue({ enabled: true, currency: "HTGe", min_amount: "1", max_per_request: "50000", daily_max_per_agent: "100000", four_eyes_required: true });
  list.mockResolvedValue([]);
});

describe("AgentFloatPanel", () => {
  it("shows the agent's digital float and max cash-in", async () => {
    useAuth.mockReturnValue({ user: { id: 2 } });
    render(<AgentFloatPanel agentUserId={28} />);
    await waitFor(() => expect(screen.getAllByText(/173 HTGe/).length).toBeGreaterThan(0));
    expect(screen.getByText(/Digital float/i)).toBeTruthy();
    expect(screen.getByText(/Max cash-in it can serve/i)).toBeTruthy();
  });

  it("four-eyes: the requester cannot approve their own request (button disabled, labeled)", async () => {
    useAuth.mockReturnValue({ user: { id: 1 } }); // I am the requester (requested_by: 1)
    list.mockResolvedValue([fxReq({ requested_by: 1 })]);
    render(<AgentFloatPanel agentUserId={28} />);
    const btn = await screen.findByRole("button", { name: /You requested/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("a different admin sees an enabled Approve action", async () => {
    useAuth.mockReturnValue({ user: { id: 2 } }); // different admin
    list.mockResolvedValue([fxReq({ requested_by: 1 })]);
    render(<AgentFloatPanel agentUserId={28} />);
    const btn = await screen.findByRole("button", { name: /^Approve$/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("APPROVED request offers Execute; requester still blocked (four-eyes)", async () => {
    useAuth.mockReturnValue({ user: { id: 1 } }); // requester
    list.mockResolvedValue([fxReq({ status: "APPROVED", requested_by: 1, approved_by: 2 })]);
    render(<AgentFloatPanel agentUserId={28} />);
    const btn = await screen.findByRole("button", { name: /You requested/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables Request top-up when the policy is disabled (fail-closed)", async () => {
    useAuth.mockReturnValue({ user: { id: 2 } });
    policy.mockResolvedValue({ enabled: false, currency: "HTGe", min_amount: "1", max_per_request: "50000", daily_max_per_agent: "100000", four_eyes_required: true });
    render(<AgentFloatPanel agentUserId={28} />);
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Request top-up/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });
});
