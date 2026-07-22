/// Sprint 12.x — Twilio / Meta error code explanations for the admin
/// UI. Mirrors the backend's `suggestFix` table so operator-facing
/// language is consistent whether it comes from the timeline endpoint
/// or the UI's own display. When you add a new code here, add it to
/// `src/connect/admin/admin-diagnostics.controller.ts:suggestFix` too.

export interface ErrorCodeInfo {
  code: string;
  title: string;
  explanation: string;
  suggestion: string;
  severity: "warning" | "error";
}

export const ERROR_CODES: Record<string, ErrorCodeInfo> = {
  "63016": {
    code: "63016",
    title: "Freeform WhatsApp message outside the 24-hour window",
    explanation:
      "Meta only accepts freeform messages during a 24-hour window opened by the recipient messaging our WABA number. Outside that window, only pre-approved Message Templates deliver.",
    suggestion:
      "Register a Meta-approved Message Template + set WABA_CONTENT_SID_<template>_<locale>. The provider will auto-switch to template mode outside the 24-hour window.",
    severity: "warning",
  },
  "63018": {
    code: "63018",
    title: "Recipient is not a WhatsApp user",
    explanation: "The number does not have WhatsApp installed.",
    suggestion: "Nothing to do — the row is correctly marked failed.",
    severity: "warning",
  },
  "63024": {
    code: "63024",
    title: "Invalid content variables",
    explanation:
      "The variables we sent don't match the approved template's placeholders (count or types).",
    suggestion:
      "Compare WabaContentRegistry.variableSchema[<template>] to the Meta template's {{n}} placeholders.",
    severity: "error",
  },
  "63032": {
    code: "63032",
    title: "Template not approved",
    explanation: "Meta rejected the template.",
    suggestion: "Fix the copy or category and resubmit for approval.",
    severity: "error",
  },
  "63038": {
    code: "63038",
    title: "Daily template send limit exceeded",
    explanation: "Twilio account exceeded Meta's daily template send limit.",
    suggestion: "Backoff and retry tomorrow.",
    severity: "warning",
  },
  "21211": {
    code: "21211",
    title: "Invalid To number",
    explanation: "The recipient phone number is not a valid E.164.",
    suggestion: "Fix the caller.",
    severity: "error",
  },
};

export function explainErrorCode(code: string | null | undefined): ErrorCodeInfo | null {
  if (!code) return null;
  return ERROR_CODES[code] ?? null;
}
