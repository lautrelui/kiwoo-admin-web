import { cn } from "@/lib/utils";

interface Props {
  error?: unknown;
  className?: string;
}

/**
 * Uniform error banner for Operations Center pages.
 *
 * Kept intentionally boring so operators associate one visual with
 * "something's wrong, try refresh." No stack trace, no toast — the
 * error stays on the page until the next successful fetch clears it.
 */
export function ErrorNote({ error, className }: Props) {
  if (!error) return null;
  const msg = normalize(error);
  return (
    <div
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
        className,
      )}
      role="alert"
    >
      <span className="font-semibold">Error:</span> {msg}
    </div>
  );
}

function normalize(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const anyErr = e as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const msg = anyErr.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  return anyErr.message ?? "Unknown error";
}
