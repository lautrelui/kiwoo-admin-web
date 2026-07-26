import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Treasury from "@/pages/Treasury";
import Disbursement from "@/pages/Disbursement";
import FundingReview from "@/pages/FundingReview";
import Kyc from "@/pages/Kyc";
import Agents from "@/pages/Agents";
import Merchants from "@/pages/Merchants";
import Partners from "@/pages/Partners";
import Transactions from "@/pages/Transactions";
import AuditLogs from "@/pages/AuditLogs";
import Settings from "@/pages/Settings";
// Sprint 12.x — Connect Enterprise operator pages.
import ConnectDiagnostics from "@/pages/ConnectDiagnostics";
import ConnectConversation from "@/pages/ConnectConversation";
import ConnectTemplates from "@/pages/ConnectTemplates";
import ConnectMessageTimeline from "@/pages/ConnectMessageTimeline";
import ConnectProviderHealth from "@/pages/ConnectProviderHealth";
import ConnectWatchdog from "@/pages/ConnectWatchdog";
// Sprint 13 Task 126.5 — Kiwoo Operations Center pages.
import OperationsDashboard from "@/pages/ops/OperationsDashboard";
import PlatformUsers from "@/pages/ops/PlatformUsers";
import PlatformUserDetail from "@/pages/ops/PlatformUserDetail";
import EventExplorer from "@/pages/ops/EventExplorer";
import EventDetail from "@/pages/ops/EventDetail";
import SubscriberManagement from "@/pages/ops/SubscriberManagement";
import NotificationExplorer from "@/pages/ops/NotificationExplorer";
import NotificationDetail from "@/pages/ops/NotificationDetail";
import ActivityExplorer from "@/pages/ops/ActivityExplorer";
import SearchExplorer from "@/pages/ops/SearchExplorer";
import ProductRegistry from "@/pages/ops/ProductRegistry";
import CommunicationsCenter from "@/pages/ops/CommunicationsCenter";
// Sprint 13 Task 128.5 — Knowledge Explorer (Operations Center)
import KnowledgeExplorer from "@/pages/ops/KnowledgeExplorer";
import KnowledgeDetail from "@/pages/ops/KnowledgeDetail";
// Sprint 13 Task 130.5 — Analytics (Operations Center)
import AnalyticsPage from "@/pages/ops/AnalyticsPage";
// Sprint 13.9 Task 133 — Scenario Runner (Operations Center)
import ScenarioRunner from "@/pages/ops/ScenarioRunner";
import ScenarioRunDetail from "@/pages/ops/ScenarioRunDetail";
// M4A-2 — Marketplace (Participant) surface. Participant-tenant only (Corp/LEH/merchant/LP). Every
// route is additionally gated server-side by MARKETPLACE_PARTICIPANT_ENABLED (fail-closed while dark).
import ParticipantOverview from "@/pages/marketplace/Overview";
import ParticipantLiquidity from "@/pages/marketplace/Liquidity";
import ParticipantOffers from "@/pages/marketplace/Offers";
import ParticipantObligations from "@/pages/marketplace/Obligations";
import ObligationDetail from "@/pages/marketplace/ObligationDetail";
import ParticipantDisputes from "@/pages/marketplace/Disputes";
import ParticipantEarnings from "@/pages/marketplace/Earnings";
import ParticipantActivity from "@/pages/marketplace/Activity";

const PARTICIPANT_ROLE_GUARD: ("PARTICIPANT" | "CORP" | "LEH" | "MERCHANT_PARTICIPANT")[] = [
  "PARTICIPANT",
  "CORP",
  "LEH",
  "MERCHANT_PARTICIPANT",
];
// M4A-3 — operator adjudication console (operator-only; backend also gates on MARKETPLACE_OPERATOR_ENABLED).
import ReviewQueue from "@/pages/marketplace/operator/ReviewQueue";
import CaseDetail from "@/pages/marketplace/operator/CaseDetail";
const OPERATOR_ROLE_GUARD: ("ADMIN" | "SUPER_ADMIN" | "COMPLIANCE")[] = ["ADMIN", "SUPER_ADMIN", "COMPLIANCE"];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/treasury"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "TREASURY"]}>
            <Treasury />
          </ProtectedRoute>
        }
      />
      <Route
        path="/treasury/disburse"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "TREASURY"]}>
            <Disbursement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans/funding"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "TREASURY"]}>
            <FundingReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "COMPLIANCE"]}>
            <Kyc />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <Agents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchants"
        element={
          <ProtectedRoute>
            <Merchants />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partners"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "TREASURY"]}>
            <Partners />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "COMPLIANCE"]}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      {/* Sprint 12.x — Connect Enterprise. Same role gate as other admin
          areas (backend also enforces via AdminGuard). */}
      <Route
        path="/connect/whatsapp/diagnostics"
        element={
          <ProtectedRoute>
            <ConnectDiagnostics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect/conversation"
        element={
          <ProtectedRoute>
            <ConnectConversation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect/templates"
        element={
          <ProtectedRoute>
            <ConnectTemplates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect/messages/:id/timeline"
        element={
          <ProtectedRoute>
            <ConnectMessageTimeline />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect/providers/health"
        element={
          <ProtectedRoute>
            <ConnectProviderHealth />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect/watchdog"
        element={
          <ProtectedRoute>
            <ConnectWatchdog />
          </ProtectedRoute>
        }
      />
      {/* Sprint 13 Task 126.5 — Kiwoo Operations Center. The backend
          `AdminGuard` is the enforcement point for every /admin/*
          fetch these pages issue, so route-level roles just gate the
          navigation UX. */}
      <Route
        path="/ops"
        element={
          <ProtectedRoute>
            <OperationsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/users"
        element={
          <ProtectedRoute>
            <PlatformUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/users/:id"
        element={
          <ProtectedRoute>
            <PlatformUserDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/events"
        element={
          <ProtectedRoute>
            <EventExplorer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/events/:id"
        element={
          <ProtectedRoute>
            <EventDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/subscribers"
        element={
          <ProtectedRoute>
            <SubscriberManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/notifications"
        element={
          <ProtectedRoute>
            <NotificationExplorer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/notifications/:id"
        element={
          <ProtectedRoute>
            <NotificationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/activity"
        element={
          <ProtectedRoute>
            <ActivityExplorer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/search"
        element={
          <ProtectedRoute>
            <SearchExplorer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/products"
        element={
          <ProtectedRoute>
            <ProductRegistry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/communications"
        element={
          <ProtectedRoute>
            <CommunicationsCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/knowledge"
        element={
          <ProtectedRoute>
            <KnowledgeExplorer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/knowledge/:id"
        element={
          <ProtectedRoute>
            <KnowledgeDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/scenarios"
        element={
          <ProtectedRoute>
            <ScenarioRunner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/scenarios/runs/:id"
        element={
          <ProtectedRoute>
            <ScenarioRunDetail />
          </ProtectedRoute>
        }
      />
      {/* M4A-2 — Marketplace (Participant). Route-level roles gate the UX; the backend
          `MARKETPLACE_PARTICIPANT_ENABLED` flag is the enforcement point (503 while dark). */}
      <Route
        path="/participant/marketplace"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ParticipantOverview /></ProtectedRoute>}
      />
      <Route
        path="/participant/marketplace/liquidity"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ParticipantLiquidity /></ProtectedRoute>}
      />
      <Route
        path="/participant/marketplace/offers"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ParticipantOffers /></ProtectedRoute>}
      />
      <Route
        path="/participant/marketplace/obligations"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ParticipantObligations /></ProtectedRoute>}
      />
      <Route
        path="/participant/marketplace/obligations/:ref"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ObligationDetail /></ProtectedRoute>}
      />
      <Route
        path="/participant/marketplace/disputes"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ParticipantDisputes /></ProtectedRoute>}
      />
      <Route
        path="/participant/marketplace/earnings"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ParticipantEarnings /></ProtectedRoute>}
      />
      <Route
        path="/participant/marketplace/activity"
        element={<ProtectedRoute roles={PARTICIPANT_ROLE_GUARD}><ParticipantActivity /></ProtectedRoute>}
      />
      {/* M4A-3 — Marketplace (Operator) adjudication console. Operator-only role gate; backend
          MARKETPLACE_OPERATOR_ENABLED is the enforcement point (503 while dark). */}
      <Route path="/operator/marketplace" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><ReviewQueue preset="all" /></ProtectedRoute>} />
      <Route path="/operator/marketplace/disputes" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><ReviewQueue preset="disputes" /></ProtectedRoute>} />
      <Route path="/operator/marketplace/timeouts" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><ReviewQueue preset="timeouts" /></ProtectedRoute>} />
      <Route path="/operator/marketplace/conflicts" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><ReviewQueue preset="conflicts" /></ProtectedRoute>} />
      <Route path="/operator/marketplace/reconciliation" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><ReviewQueue preset="reconciliation" /></ProtectedRoute>} />
      <Route path="/operator/marketplace/awaiting-approval" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><ReviewQueue preset="awaiting-approval" /></ProtectedRoute>} />
      <Route path="/operator/marketplace/adjudicated" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><ReviewQueue preset="adjudicated" /></ProtectedRoute>} />
      <Route path="/operator/marketplace/case/:ref" element={<ProtectedRoute roles={OPERATOR_ROLE_GUARD}><CaseDetail /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
