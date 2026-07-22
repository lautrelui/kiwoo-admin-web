import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: unknown;
  className?: string;
  redactKeys?: string[];
  maxHeight?: string;
}

const DEFAULT_REDACT = [
  "pin",
  "hash_password",
  "password",
  "privateKey",
  "private_key",
  "secret",
  "token",
  "api_key",
  "apiKey",
  "authorization",
];

/**
 * Read-only pretty-printer for the Operations Center.
 *
 * Deep-clones and masks any key whose lowercased name matches
 * `redactKeys` (defaulting to a superset of the platform's known
 * sensitive fields). This is a defense-in-depth layer — the backend
 * already scrubs these, but if a bad event slips through, the admin
 * UI must not be the surface that leaks it.
 */
export function PayloadViewer({
  value,
  className,
  redactKeys,
  maxHeight = "24rem",
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const cleaned = useMemo(() => redact(value, redactKeys), [value, redactKeys]);
  const text = useMemo(() => {
    try {
      return JSON.stringify(cleaned, null, 2);
    } catch {
      return String(cleaned);
    }
  }, [cleaned]);

  return (
    <div className={cn("rounded-lg border border-ink-100 bg-ink-50/60", className)}>
      <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2 text-xs text-ink-500">
        <span className="font-medium uppercase tracking-wide">Payload</span>
        <button
          className="rounded-md border border-ink-200 bg-white px-2 py-0.5 text-[11px] hover:bg-ink-50"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {expanded && (
        <pre
          className="overflow-auto px-3 py-2 text-xs leading-snug text-ink-800"
          style={{ maxHeight }}
        >
          {text}
        </pre>
      )}
    </div>
  );
}

function redact(input: unknown, redactKeys?: string[]): unknown {
  const banned = new Set(
    [...DEFAULT_REDACT, ...(redactKeys ?? [])].map((k) => k.toLowerCase()),
  );
  const walk = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (banned.has(k.toLowerCase())) out[k] = "***REDACTED***";
        else out[k] = walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(input);
}
