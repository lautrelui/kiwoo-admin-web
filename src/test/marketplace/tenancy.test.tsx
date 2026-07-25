import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Role } from "@/types";

// Mock auth so we can drive the Sidebar with different role sets.
let currentRoles: Role[] = [];
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, roles: currentRoles },
    hasRole: (...roles: Role[]) => roles.some((r) => currentRoles.includes(r)),
  }),
}));

import { Sidebar } from "@/components/layout/Sidebar";

function renderSidebar(roles: Role[]) {
  currentRoles = roles;
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
}

const has = (c: HTMLElement, href: string) => !!c.querySelector(`a[href="${href}"]`);

// M4A-2 · TENANCY — a pure participant sees ONLY the participant Marketplace section; an operator never
// sees it (and participants never see operator/ops pages). Enforcement is server-side; this is the UX.

describe("navigation tenancy separation", () => {
  it("pure participant (LEH) sees participant Marketplace, NOT operator/ops pages", () => {
    const { container } = renderSidebar(["LEH"]);
    expect(has(container, "/participant/marketplace")).toBe(true);
    expect(has(container, "/participant/marketplace/obligations")).toBe(true);
    expect(has(container, "/participant/marketplace/earnings")).toBe(true);
    // Operator/ops pages hidden.
    expect(has(container, "/treasury")).toBe(false);
    expect(has(container, "/ops")).toBe(false);
    expect(has(container, "/kyc")).toBe(false);
  });

  it("operator (ADMIN) sees the operator app, NOT the participant Marketplace section", () => {
    const { container } = renderSidebar(["ADMIN"]);
    expect(has(container, "/treasury")).toBe(true);
    expect(has(container, "/ops")).toBe(true);
    expect(has(container, "/participant/marketplace")).toBe(false);
    expect(has(container, "/participant/marketplace/obligations")).toBe(false);
  });

  it("a user with BOTH roles sees both surfaces", () => {
    const { container } = renderSidebar(["ADMIN", "LEH"]);
    expect(has(container, "/treasury")).toBe(true);
    expect(has(container, "/participant/marketplace")).toBe(true);
  });
});
