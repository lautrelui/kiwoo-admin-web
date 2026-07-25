import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";

// M4A-2 · one-time collection-credential validation (SECURITY-CRITICAL).
//
// The customer presents a one-time collection CODE and/or an opaque QR token. This control:
//  - keeps the code/QR only in component state (React memory) — NEVER localStorage/SharedPreferences/
//    SQLite/durable cache, NEVER a URL parameter, NEVER analytics, NEVER console/logs;
//  - CLEARS both fields immediately after submission (success or failure);
//  - prevents duplicate submit while a request is in flight;
//  - decodes/derives NOTHING from the QR — the opaque token is passed straight to the backend, which
//    is the sole authority on validity/amount/participant binding;
//  - is a SEPARATE action from cash-handover confirmation (that lives in a different dialog).
//
// A camera-based scanner can decode the QR into `qr_token`; until that native integration ships, the
// participant pastes/keys the opaque token — the manual path is always available (accessibility).

export function CredentialInput({
  disabled,
  onValidate,
}: {
  disabled?: boolean;
  /** Returns a backend status string; throws MarketplaceError on invalid/expired/wrong-participant. */
  onValidate: (code: string, qrToken?: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  function clearSecrets() {
    // Overwrite then empty — the raw values must not linger in state.
    setCode("");
    setQrToken("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || disabled) return; // duplicate-submit guard
    const c = code.trim().toUpperCase();
    if (!c) {
      setLocalError("Enter the customer's collection code.");
      return;
    }
    setBusy(true);
    setLocalError(null);
    const token = qrToken.trim() || undefined;
    // Clear the sensitive fields BEFORE awaiting, so they never persist across the request lifetime.
    clearSecrets();
    try {
      await onValidate(c, token);
    } catch (err) {
      // Surface a safe message; never echo the raw code back into the DOM/logs.
      setLocalError((err as { message?: string })?.message || "Validation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" autoComplete="off" aria-label="Validate collection credential">
      <FormInput
        ref={codeRef}
        label="Collection code"
        name="collection_code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. 7Q2K9ABCXY"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        disabled={disabled || busy}
        hint="The one-time code the customer shows you. Not stored — cleared after you submit."
      />
      <FormInput
        label="Scanned QR token (optional)"
        name="qr_token"
        value={qrToken}
        onChange={(e) => setQrToken(e.target.value)}
        placeholder="MQR-… (opaque)"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled || busy}
        hint="Opaque token from the customer's QR. No customer data is derived from it."
      />
      {localError && (
        <p role="alert" className="text-xs text-red-600">
          {localError}
        </p>
      )}
      <Button type="submit" size="sm" loading={busy} disabled={disabled}>
        Validate credential
      </Button>
    </form>
  );
}
