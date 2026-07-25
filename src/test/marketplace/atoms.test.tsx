import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FeatureGate,
  MoneyBreakdown,
  OfflineBanner,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { TEST_TRANSACTION_NOTICE } from "@/lib/marketplace";

// M4A-2 · COMPONENT — the mandatory TEST notice, feature-gate states, money separation, unknown-state
// fallback, offline banner. Accessibility: the notice is a labelled note (not conveyed by colour alone).

describe("TestNotice", () => {
  it("renders the exact backend string as a labelled note", () => {
    render(<TestNotice notice={TEST_TRANSACTION_NOTICE} />);
    const note = screen.getByRole("note", { name: "Test transaction notice" });
    expect(note).toHaveTextContent("TEST TRANSACTION — NO PHYSICAL CASH WAS DISBURSED");
  });
  it("renders nothing when there is no notice (non-TEST env)", () => {
    const { container } = render(<TestNotice notice={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("renders nothing for whitespace-only notice", () => {
    const { container } = render(<TestNotice notice={"   "} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FeatureGate", () => {
  it("503/disabled → deliberate unavailable message (NOT a crash), children hidden", () => {
    render(
      <FeatureGate availability="disabled" code="marketplace_participant_disabled">
        <div>SECRET_CONTENT</div>
      </FeatureGate>
    );
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("SECRET_CONTENT")).not.toBeInTheDocument();
  });
  it("unauthorized → access message, children hidden", () => {
    render(
      <FeatureGate availability="unauthorized">
        <div>OWNED_DATA</div>
      </FeatureGate>
    );
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
    expect(screen.queryByText("OWNED_DATA")).not.toBeInTheDocument();
  });
  it("available → renders children", () => {
    render(
      <FeatureGate availability="available">
        <div>DASHBOARD</div>
      </FeatureGate>
    );
    expect(screen.getByText("DASHBOARD")).toBeInTheDocument();
  });
});

describe("MoneyBreakdown", () => {
  it("shows principal, compensation and total as distinct rows; comp is NOT a deduction", () => {
    render(<MoneyBreakdown principal="100" compensation="3" total="103" currency="HTG" />);
    expect(screen.getByText("Principal advanced")).toBeInTheDocument();
    expect(screen.getByText("Participant compensation")).toBeInTheDocument();
    expect(screen.getByText("Total entitlement")).toBeInTheDocument();
    expect(screen.getByText(/NOT deducted from the principal/i)).toBeInTheDocument();
    expect(screen.getByText("103 HTG")).toBeInTheDocument();
  });
});

describe("StateBadge", () => {
  it("unknown state → safe 'Status unavailable' label (never guesses)", () => {
    render(<StateBadge state="SOME_FUTURE_STATE" />);
    expect(screen.getByText("Status unavailable")).toBeInTheDocument();
  });
  it("known state → mapped label", () => {
    render(<StateBadge state="READY_FOR_COLLECTION" />);
    expect(screen.getByText("Ready for collection")).toBeInTheDocument();
  });
});

describe("OfflineBanner", () => {
  it("hidden when online, visible + alert when offline", () => {
    const { rerender, container } = render(<OfflineBanner online />);
    expect(container).toBeEmptyDOMElement();
    rerender(<OfflineBanner online={false} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/offline/i);
  });
});
