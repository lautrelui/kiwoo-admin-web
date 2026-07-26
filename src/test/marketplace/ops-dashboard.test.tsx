import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
// recharts needs real layout dimensions (0 in jsdom) — stub to simple containers.
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { ResponsiveContainer: Stub, LineChart: Stub, BarChart: Stub, Line: () => null, Bar: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null };
});

const { summary, funnel, sla, liquidity, participants, alerts, timeline, trends, search } = vi.hoisted(() => ({
  summary: vi.fn(), funnel: vi.fn(), sla: vi.fn(), liquidity: vi.fn(), participants: vi.fn(), alerts: vi.fn(), timeline: vi.fn(), trends: vi.fn(), search: vi.fn(),
}));
vi.mock("@/services/marketplaceOpsService", () => ({
  marketplaceOpsService: { summary, funnel, sla, liquidity, participants, alerts, timeline, trends, search },
  marketplaceError: (e: { response?: { status?: number; data?: { message?: string[] } }; message?: string }) => ({
    status: e?.response?.status ?? null, code: e?.response?.data?.message?.[0] ?? e?.message ?? "", message: e?.response?.data?.message?.[0] ?? e?.message ?? "error",
  }),
}));

import OpsDashboard from "@/pages/marketplace/ops/Dashboard";
import { funnelRows, slaRows, alertSeverity } from "@/lib/marketplaceOps";
import { parseSummary } from "@/types/marketplaceOps";
import {
  fxAlert, fxFunnel, fxFunnelEmpty, fxLiquidity, fxLiquidityEmpty, fxParticipant, fxSla, fxSlaEmpty, fxSummary, fxSummaryEmpty, fxTimeline, fxTrend,
} from "@/lib/marketplaceOpsFixtures";

const renderDash = () => render(<MemoryRouter><OpsDashboard /></MemoryRouter>);

function loadAll(overrides: Partial<Record<string, unknown>> = {}) {
  summary.mockResolvedValue(overrides.summary ?? fxSummary);
  funnel.mockResolvedValue(overrides.funnel ?? fxFunnel);
  sla.mockResolvedValue(overrides.sla ?? fxSla);
  liquidity.mockResolvedValue(overrides.liquidity ?? fxLiquidity);
  participants.mockResolvedValue(overrides.participants ?? { page: 1, page_size: 25, total: 30, items: [fxParticipant] });
  alerts.mockResolvedValue(overrides.alerts ?? { page: 1, page_size: 25, items: [fxAlert] });
  timeline.mockResolvedValue(overrides.timeline ?? fxTimeline);
  trends.mockResolvedValue(overrides.trends ?? fxTrend);
  search.mockResolvedValue({ items: [], total: 0, limit: 25 });
}

beforeEach(() => { [summary, funnel, sla, liquidity, participants, alerts, timeline, trends, search].forEach((m) => m.mockReset()); });

describe("unit + empty-safe", () => {
  it("funnelRows is empty-safe: zero funnel → conversion null (no NaN)", () => {
    const rows = funnelRows(fxFunnelEmpty);
    expect(rows.every((r) => r.conversionPct === null)).toBe(true);
    const full = funnelRows(fxFunnel);
    expect(full[0].conversionPct).toBe(100);
  });
  it("slaRows classifies breach on >24h age", () => {
    const rows = slaRows(fxSla);
    expect(rows.find((r) => r.label === "Oldest manual review")!.status).toBe("BREACHED");
  });
  it("alertSeverity: SETTLEMENT_INCONSISTENCY → critical", () => {
    expect(alertSeverity(fxAlert)).toBe("critical");
  });
  it("parseSummary defaults to zeros", () => {
    const s = parseSummary({});
    expect(s.active_alerts).toBe(0);
    expect(s.available_liquidity).toBe("0");
  });
});

describe("privacy", () => {
  it("ops fixtures carry no forbidden fields", () => {
    for (const fx of [fxSummary, fxFunnel, fxSla, fxLiquidity, fxAlert, fxTimeline, fxParticipant]) {
      const json = JSON.stringify(fx);
      for (const f of ["journal", "collection_code", "device_ref_hash", "qr_token", "correlation_id", "trace_id", "$argon2", "metadata"]) {
        expect(json).not.toContain(f);
      }
    }
  });
});

describe("Dashboard", () => {
  it("renders overview KPIs + widgets from the ops APIs", async () => {
    loadAll();
    renderDash();
    await screen.findByText("Marketplace Control Tower");
    expect(screen.getByText("Active participants")).toBeInTheDocument();
    await screen.findByText("6"); // active participants value
    await screen.findByText(/SETTLEMENT_INCONSISTENCY/); // alert
    await screen.findByText("Realtime timeline");
  });

  it("empty marketplace renders intentionally — no crash, no NaN", async () => {
    loadAll({ summary: fxSummaryEmpty, funnel: fxFunnelEmpty, sla: fxSlaEmpty, liquidity: fxLiquidityEmpty, participants: { page: 1, page_size: 25, total: 0, items: [] }, alerts: { page: 1, page_size: 25, items: [] }, timeline: [], trends: [] });
    renderDash();
    await screen.findByText("Marketplace Control Tower");
    const empties = await screen.findAllByText(/No Marketplace flow yet|No active alerts|No recent events|No history|No liquidity/);
    expect(empties.length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("NaN");
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("503 → deliberate feature-disabled (not a crash)", async () => {
    summary.mockRejectedValue({ response: { status: 503, data: { message: ["marketplace_operations_disabled"] } } });
    renderDash();
    await screen.findByText(/temporarily unavailable/i);
  });

  it("drill-down: Manual reviews KPI links to the operator console", async () => {
    loadAll();
    const { container } = renderDash();
    await screen.findByText("Marketplace Control Tower");
    await waitFor(() => expect(container.querySelector('a[href="/operator/marketplace"]')).toBeTruthy());
    expect(container.querySelector('a[href="/operator/marketplace/disputes"]')).toBeTruthy();
  });

  it("participant health pagination requests the next page", async () => {
    loadAll();
    renderDash();
    await screen.findByText("Participant health");
    const next = screen.getAllByRole("button", { name: /Next/i })[0];
    await userEvent.click(next);
    await waitFor(() => expect(participants).toHaveBeenCalledWith(2, 25));
  });
});
