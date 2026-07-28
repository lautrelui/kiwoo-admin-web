import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { listApplications, getApplication, timeline, listNotes, addNote, assign, decide, dashboard, listPartners, getPartner } =
  vi.hoisted(() => ({
    listApplications: vi.fn(), getApplication: vi.fn(), timeline: vi.fn(), listNotes: vi.fn(), addNote: vi.fn(),
    assign: vi.fn(), decide: vi.fn(), dashboard: vi.fn(), listPartners: vi.fn(), getPartner: vi.fn(),
  }));
vi.mock("@/services/cashoutPartnerService", () => ({
  cashoutPartnerService: { listApplications, getApplication, timeline, listNotes, addNote, assign, decide, dashboard, listPartners, getPartner },
}));

import PartnerApplications from "@/pages/cashout-partners/Applications";
import PartnerApplicationDetail from "@/pages/cashout-partners/ApplicationDetail";
import PartnerDirectory from "@/pages/cashout-partners/PartnerDirectory";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { allowedActions } from "@/types/cashoutPartner";
import type { PartnerApplication, PartnerStatus } from "@/types/cashoutPartner";

function fxApp(status: PartnerStatus, over: Partial<PartnerApplication> = {}): PartnerApplication {
  return {
    id: 1, user_id: 5, status,
    display_name: "Marie's Kiosk", business_name: "Marie SARL", contact_phone: "+509370", preferred_contact: "PHONE",
    operating_city: "Port-au-Prince", neighborhood: "Pétion-Ville", languages: ["Kreyòl"], photo_url: null,
    operating_days: ["MON", "TUE"], operating_hours_start: "08:00", operating_hours_end: "17:00",
    emergency_unavailable: false, is_online: false, typical_cash_available: "50000", min_payout: "500", max_payout: "25000",
    payout_methods: ["Cash"], requirements_ack: true, terms_accepted: true, terms_version: "v1",
    submitted_at: "2026-07-27T01:00:00Z", assigned_reviewer: null, assigned_at: null, reviewed_at: null, review_note: null,
    provisioned_at: null, activated_at: null, suspended_at: null, created_at: "2026-07-27T00:00:00Z", updated_at: "2026-07-27T01:00:00Z",
    availability: "NOT_ELIGIBLE",
    user: { id: 5, name: "Marie", email: "marie@k.io", phone: "+509370", wallet_id: "GABCDEF12345" },
    compliance: { kyc_tier: "TIER_2_ID_VERIFIED", account_standing: "GOOD_STANDING", trust_band: "GOOD", open_risk_flags: 0, previous_disputes: 0, marketplace_activity: false },
    ...over,
  };
}

beforeEach(() => {
  [listApplications, getApplication, timeline, listNotes, addNote, assign, decide, dashboard, listPartners, getPartner].forEach((m) => m.mockReset());
  dashboard.mockResolvedValue({ applications_pending: 3, applications_today: 1, avg_approval_seconds: 7200, eligible_partners: 2, available_partners: 1, suspended_partners: 0 });
  timeline.mockResolvedValue([]); listNotes.mockResolvedValue([]);
});

describe("workflow / state-validity (only valid actions per state)", () => {
  it("SUBMITTED offers review/approve/reject but never provision or activate", () => {
    const a = allowedActions("SUBMITTED");
    expect(a).toContain("approve");
    expect(a).toContain("reject");
    expect(a).toContain("start-review");
    expect(a).not.toContain("provision");
    expect(a).not.toContain("activate");
  });
  it("APPROVED offers provision (not activate); PROVISIONED offers activate (not provision)", () => {
    expect(allowedActions("APPROVED")).toContain("provision");
    expect(allowedActions("APPROVED")).not.toContain("activate");
    expect(allowedActions("PARTICIPANT_PROVISIONED")).toContain("activate");
    expect(allowedActions("PARTICIPANT_PROVISIONED")).not.toContain("provision");
  });
  it("MARKETPLACE_ACTIVE only suspend/deactivate; terminal states offer nothing", () => {
    expect(allowedActions("MARKETPLACE_ACTIVE").sort()).toEqual(["deactivate", "suspend"]);
    expect(allowedActions("REJECTED")).toEqual([]);
    expect(allowedActions("DRAFT")).toEqual([]);
  });
});

describe("Applications queue", () => {
  it("renders KPIs and rows, and exposes the status filter", async () => {
    listApplications.mockResolvedValue({ total: 1, items: [fxApp("SUBMITTED")] });
    render(<MemoryRouter><PartnerApplications /></MemoryRouter>);
    expect(await screen.findByText("Marie's Kiosk")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // pending KPI
    expect(screen.getByText("Port-au-Prince")).toBeInTheDocument();
    expect(screen.getByText("TIER_2_ID_VERIFIED")).toBeInTheDocument(); // KYC column
  });

  it("changing the status filter re-queries with that status", async () => {
    listApplications.mockResolvedValue({ total: 0, items: [] });
    render(<MemoryRouter><PartnerApplications /></MemoryRouter>);
    await waitFor(() => expect(listApplications).toHaveBeenCalled());
    const select = screen.getByLabelText("Status");
    await userEvent.selectOptions(select, "APPROVED");
    await waitFor(() => expect(listApplications).toHaveBeenLastCalledWith(expect.objectContaining({ status: "APPROVED" })));
  });
});

describe("Application detail", () => {
  function renderDetail() {
    return render(
      <MemoryRouter initialEntries={["/cashout-partners/applications/1"]}>
        <Routes><Route path="/cashout-partners/applications/:id" element={<PartnerApplicationDetail />} /></Routes>
      </MemoryRouter>
    );
  }

  it("shows the Approved≠Active separation and only state-valid actions", async () => {
    getApplication.mockResolvedValue(fxApp("SUBMITTED"));
    renderDetail();
    await screen.findByText(/Approved ≠ Marketplace Active/i);
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate Marketplace" })).not.toBeInTheDocument();
  });

  it("approving calls the decide endpoint", async () => {
    getApplication.mockResolvedValue(fxApp("SUBMITTED"));
    decide.mockResolvedValue(fxApp("APPROVED"));
    renderDetail();
    await screen.findByRole("button", { name: "Approve" });
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith(1, "approve"));
  });

  it("provisioned partner exposes Activate Marketplace", async () => {
    getApplication.mockResolvedValue(fxApp("PARTICIPANT_PROVISIONED"));
    renderDetail();
    expect(await screen.findByRole("button", { name: "Activate Marketplace" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Provision Partner" })).not.toBeInTheDocument();
  });
});

describe("Partner directory never fabricates activity", () => {
  it("renders partners with zeroed marketplace stats", async () => {
    listPartners.mockResolvedValue({ total: 1, items: [{ ...fxApp("MARKETPLACE_ACTIVE", { availability: "AVAILABLE" }), stats: { current_requests: 0, completed_requests: 0, completed_payouts: "0", acceptance_rate: null, avg_response_time_seconds: null, customer_disputes: 0, customer_confirmations: 0, marketplace_activity: false } }] });
    render(<MemoryRouter><PartnerDirectory /></MemoryRouter>);
    expect(await screen.findByText("Marie's Kiosk")).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
  });

  it("P0: shows distinct Business Active / Discoverable / Executable columns; ACTIVE ≠ discoverable/executable while dark", async () => {
    const stats = { current_requests: 0, completed_requests: 0, completed_payouts: "0", acceptance_rate: null, avg_response_time_seconds: null, customer_disputes: 0, customer_confirmations: 0, marketplace_activity: false };
    listPartners.mockResolvedValue({ total: 1, items: [{
      ...fxApp("MARKETPLACE_ACTIVE", { availability: "AVAILABLE", readiness: { business_active: true, discoverable: false, executable: false } }),
      stats,
    }] });
    render(<MemoryRouter><PartnerDirectory /></MemoryRouter>);
    expect(await screen.findByText("Marie's Kiosk")).toBeInTheDocument();
    // The three distinct readiness columns exist as separate headers.
    expect(screen.getByRole("columnheader", { name: "Business Active" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Discoverable" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Executable" })).toBeInTheDocument();
    // Business Active = Yes, but Discoverable + Executable = No (rails dark) → two "No" pills.
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getAllByText("No").length).toBeGreaterThanOrEqual(2);
  });
});

describe("RBAC", () => {
  it("redirects a user without an allowed role, and renders for an allowed one", async () => {
    const authMock = await import("@/context/AuthContext");
    const spy = vi.spyOn(authMock, "useAuth");

    spy.mockReturnValue({ token: "t", user: { id: 1, role: "SUPPORT", roles: ["SUPPORT"] }, loading: false, hasRole: () => false } as any);
    const { unmount } = render(
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/secret" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "COMPLIANCE"]}><div>PARTNER CONSOLE</div></ProtectedRoute>} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText("PARTNER CONSOLE")).not.toBeInTheDocument();
    unmount();

    spy.mockReturnValue({ token: "t", user: { id: 1, role: "ADMIN", roles: ["ADMIN"] }, loading: false, hasRole: () => true } as any);
    render(
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/secret" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "COMPLIANCE"]}><div>PARTNER CONSOLE</div></ProtectedRoute>} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("PARTNER CONSOLE")).toBeInTheDocument();
    spy.mockRestore();
  });
});
