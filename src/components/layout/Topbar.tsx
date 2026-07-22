import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "../ui/Button";

interface Props {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-6">
      <div>
        {title && (
          <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
        )}
        {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-ink-800">
            {user?.name || user?.email || user?.phone || "Admin"}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-ink-400">
            {user?.role || user?.roles?.join(", ") || "operator"}
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {(user?.name || user?.email || "A").slice(0, 1).toUpperCase()}
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
