import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { OPERATOR_ROLES, PARTICIPANT_ROLES } from "@/lib/roles";
import type { Role } from "@/types";

interface NavItem {
  label: string;
  to: string;
  icon: string;
  roles?: Role[];
  section?: string;
  /** Marketplace participant surface — shown ONLY to participant users. */
  participant?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/", icon: "▦" },
  { label: "Treasury", to: "/treasury", icon: "₿", roles: ["ADMIN", "SUPER_ADMIN", "TREASURY"] },
  { label: "Disbursement", to: "/treasury/disburse", icon: "💸", roles: ["ADMIN", "SUPER_ADMIN", "TREASURY"] },
  { label: "Loan Funding", to: "/loans/funding", icon: "⚖", roles: ["ADMIN", "SUPER_ADMIN", "TREASURY"] },
  { label: "KYC / AML", to: "/kyc", icon: "✓", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Agents", to: "/agents", icon: "◉" },
  { label: "Merchants", to: "/merchants", icon: "◇" },
  { label: "Partners", to: "/partners", icon: "◈", roles: ["ADMIN", "SUPER_ADMIN", "TREASURY"] },
  { label: "Transactions", to: "/transactions", icon: "⇄" },
  { label: "Audit Logs", to: "/audit", icon: "▤", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Settings", to: "/settings", icon: "⚙" },
  // Sprint 13 Task 126.5 — Kiwoo Operations Center: the operator console
  // that turns everything the Intelligence Platform emits into a pane
  // of glass. Read-only surface — no business logic lives here.
  { label: "Operations Dashboard", to: "/ops", icon: "◎", section: "Kiwoo Operations" },
  { label: "Platform Users", to: "/ops/users", icon: "◐", section: "Kiwoo Operations" },
  { label: "Event Explorer", to: "/ops/events", icon: "⌘", section: "Kiwoo Operations" },
  { label: "Subscribers", to: "/ops/subscribers", icon: "⇢", section: "Kiwoo Operations" },
  { label: "Notifications", to: "/ops/notifications", icon: "✦", section: "Kiwoo Operations" },
  { label: "Activity", to: "/ops/activity", icon: "▤", section: "Kiwoo Operations" },
  { label: "Search & Knowledge", to: "/ops/search", icon: "⌕", section: "Kiwoo Operations" },
  { label: "Knowledge", to: "/ops/knowledge", icon: "◈", section: "Kiwoo Operations" },
  { label: "Analytics", to: "/ops/analytics", icon: "◨", section: "Kiwoo Operations" },
  { label: "Scenario Runner", to: "/ops/scenarios", icon: "▶", section: "Kiwoo Operations" },
  { label: "Product Registry", to: "/ops/products", icon: "▣", section: "Kiwoo Operations" },
  { label: "Communications Center", to: "/ops/communications", icon: "▲", section: "Kiwoo Operations" },
  // Sprint 12.x — Kiwoo Communications (Connect Enterprise operator surface).
  { label: "WhatsApp Diagnostics", to: "/connect/whatsapp/diagnostics", icon: "▤", section: "Communications" },
  { label: "Conversation Inspector", to: "/connect/conversation", icon: "◔", section: "Communications" },
  { label: "Templates", to: "/connect/templates", icon: "▤", section: "Communications" },
  { label: "Provider Health", to: "/connect/providers/health", icon: "◉", section: "Communications" },
  { label: "Status Watchdog", to: "/connect/watchdog", icon: "↺", section: "Communications" },
  // M4A-2 — Marketplace (Participant): Corp/LEH/merchant/LP self-service. Participant-only; never
  // shown to operators, and these users never see the operator/ops pages above.
  // M4A-3 — Marketplace (Operator) adjudication console. Operator-only (ADMIN/SUPER_ADMIN/COMPLIANCE);
  // never shown to participants. Backend enforces MARKETPLACE_OPERATOR_ENABLED + role.
  { label: "Review Queue", to: "/operator/marketplace", icon: "⚖", section: "Marketplace (Operator)", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Open Disputes", to: "/operator/marketplace/disputes", icon: "⚠", section: "Marketplace (Operator)", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Timeouts", to: "/operator/marketplace/timeouts", icon: "⏱", section: "Marketplace (Operator)", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Evidence Conflicts", to: "/operator/marketplace/conflicts", icon: "◑", section: "Marketplace (Operator)", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Reconciliation", to: "/operator/marketplace/reconciliation", icon: "↺", section: "Marketplace (Operator)", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Awaiting 2nd Approval", to: "/operator/marketplace/awaiting-approval", icon: "◔", section: "Marketplace (Operator)", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Adjudicated", to: "/operator/marketplace/adjudicated", icon: "✓", section: "Marketplace (Operator)", roles: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"] },
  { label: "Overview", to: "/participant/marketplace", icon: "◎", section: "Marketplace (Participant)", participant: true },
  { label: "Liquidity", to: "/participant/marketplace/liquidity", icon: "≋", section: "Marketplace (Participant)", participant: true },
  { label: "Offers", to: "/participant/marketplace/offers", icon: "◈", section: "Marketplace (Participant)", participant: true },
  { label: "Obligations", to: "/participant/marketplace/obligations", icon: "⇄", section: "Marketplace (Participant)", participant: true },
  { label: "Disputes", to: "/participant/marketplace/disputes", icon: "⚠", section: "Marketplace (Participant)", participant: true },
  { label: "Earnings", to: "/participant/marketplace/earnings", icon: "₿", section: "Marketplace (Participant)", participant: true },
  { label: "Activity", to: "/participant/marketplace/activity", icon: "▤", section: "Marketplace (Participant)", participant: true },
];

export function Sidebar() {
  const { user, hasRole } = useAuth();

  // Tenancy separation: a PURE participant (participant role, no operator role) sees ONLY the
  // participant Marketplace section; everyone else sees the operator app WITHOUT that section.
  const isParticipant = hasRole(...PARTICIPANT_ROLES);
  const isOperator = hasRole(...OPERATOR_ROLES);
  const pureParticipant = isParticipant && !isOperator;

  const items = NAV.filter((item) => {
    if (item.participant) return isParticipant; // participant section only for participants
    if (pureParticipant) return false; // hide operator/ops pages from pure participants
    if (!item.roles) return true;
    if (!user) return true; // show all if role unknown — backend still authorizes
    return hasRole(...item.roles);
  });

  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
          K
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-900">Kiwoo Admin</div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400">
            Fintech Console
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {groupBySection(items).map((group) => (
          <div key={group.section ?? "__root__"} className="space-y-1">
            {group.section && (
              <div className="mt-4 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                {group.section}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  )
                }
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-ink-100 px-5 py-3 text-[11px] text-ink-400">
        {import.meta.env.VITE_ENV_LABEL || "development"} ·{" "}
        {import.meta.env.VITE_ASSET_CODE || "HTGe"}
      </div>
    </aside>
  );
}

/// Group NAV entries by their optional `section` header. Items without a
/// section land in the root group first; sectioned groups render in the
/// order the sections were introduced (first appearance wins).
function groupBySection(items: NavItem[]): { section?: string; items: NavItem[] }[] {
  const groups: { section?: string; items: NavItem[] }[] = [];
  const bySection = new Map<string | undefined, NavItem[]>();
  const order: (string | undefined)[] = [];
  for (const item of items) {
    const s = item.section;
    if (!bySection.has(s)) {
      bySection.set(s, []);
      order.push(s);
    }
    bySection.get(s)!.push(item);
  }
  for (const s of order) {
    groups.push({ section: s, items: bySection.get(s)! });
  }
  return groups;
}
