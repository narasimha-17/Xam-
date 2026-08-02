import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="app-backdrop" />
      <h1 className="font-display text-6xl font-bold text-ink">404</h1>
      <p className="text-ink-muted">This page doesn't exist.</p>
      <Link to="/dashboard">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
