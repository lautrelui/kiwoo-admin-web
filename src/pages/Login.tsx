import { FormEvent, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { apiErrorMessage } from "@/lib/api";

export default function Login() {
  const { signIn, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      await signIn({
        password,
        ...(isEmail ? { email: identifier } : { phone: identifier }),
      });
      const from = (location.state as { from?: string } | null)?.from || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-50 via-white to-brand-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-8 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            K
          </div>
          <div>
            <div className="text-lg font-semibold text-ink-900">Kiwoo Admin</div>
            <div className="text-xs text-ink-400">Sign in to the operator console</div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput
            name="identifier"
            label="Phone or email"
            placeholder="+509… or admin@kiwoo.ht"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
          <FormInput
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-ink-400">
          Restricted access. All actions are audited.
        </p>
      </div>
    </div>
  );
}
