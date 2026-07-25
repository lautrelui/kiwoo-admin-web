import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CredentialInput } from "@/components/marketplace/CredentialInput";

// M4A-2 · SECURITY — the one-time collection credential must never persist or leak, must clear after
// submit, must guard duplicate submit, and passes the QR token opaquely (no decoding).

const CODE = "7Q2K9ABCXY";

let storageWrites: string[];
let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  storageWrites = [];
  const realSet = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
    storageWrites.push(`${k}=${v}`);
    return realSet.call(this, k, v);
  });
  consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe("CredentialInput security", () => {
  it("submits code+opaque QR, then CLEARS both fields; never writes secrets to storage or logs", async () => {
    const onValidate = vi.fn().mockResolvedValue(undefined);
    render(<CredentialInput onValidate={onValidate} />);
    const code = screen.getByLabelText(/Collection code/i);
    const qr = screen.getByLabelText(/Scanned QR token/i);

    await userEvent.type(code, CODE.toLowerCase()); // typed lowercase → normalised to upper on submit
    await userEvent.type(qr, "MQR-opaque-1");
    await userEvent.click(screen.getByRole("button", { name: /Validate credential/i }));

    await waitFor(() => expect(onValidate).toHaveBeenCalledTimes(1));
    expect(onValidate).toHaveBeenCalledWith(CODE, "MQR-opaque-1");

    // Fields cleared after submit — the raw code must not linger in the DOM.
    expect((code as HTMLInputElement).value).toBe("");
    expect((qr as HTMLInputElement).value).toBe("");

    // No secret written to localStorage/sessionStorage.
    expect(storageWrites.join("|")).not.toContain(CODE);
    expect(storageWrites.join("|")).not.toContain("MQR-opaque-1");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    // No secret written to console.
    const logged = consoleSpy.mock.calls.flat().join(" ");
    expect(logged).not.toContain(CODE);
    expect(logged).not.toContain("MQR-opaque-1");

    // No secret in the URL.
    expect(window.location.href).not.toContain(CODE);
  });

  it("prevents duplicate submit while a validation is in flight", async () => {
    let resolve!: () => void;
    const onValidate = vi.fn().mockImplementation(() => new Promise<void>((r) => (resolve = r)));
    render(<CredentialInput onValidate={onValidate} />);
    await userEvent.type(screen.getByLabelText(/Collection code/i), CODE);
    const btn = screen.getByRole("button", { name: /Validate credential/i });
    await userEvent.click(btn);
    await userEvent.click(btn); // second click while pending
    expect(onValidate).toHaveBeenCalledTimes(1);
    resolve();
  });

  it("requires a code (no empty submit)", async () => {
    const onValidate = vi.fn();
    render(<CredentialInput onValidate={onValidate} />);
    await userEvent.click(screen.getByRole("button", { name: /Validate credential/i }));
    expect(onValidate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter the customer's collection code/i);
  });

  it("surfaces a safe error message without echoing the raw code", async () => {
    const onValidate = vi.fn().mockRejectedValue({ message: "collection_code_invalid" });
    render(<CredentialInput onValidate={onValidate} />);
    await userEvent.type(screen.getByLabelText(/Collection code/i), CODE);
    await userEvent.click(screen.getByRole("button", { name: /Validate credential/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("collection_code_invalid"));
    expect(screen.getByRole("alert").textContent).not.toContain(CODE);
  });
});
