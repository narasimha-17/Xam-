import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { resetPassword } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "This reset link is invalid or has expired.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden px-6">
      <div className="app-backdrop">
        <div className="bg-grid" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass relative w-full max-w-sm rounded-2xl p-8 shadow-glow-lg"
      >
        <Logo className="mb-8 text-xl" />
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 size={22} />
            </div>
            <h1 className="font-display text-xl font-semibold text-ink">Password updated</h1>
            <p className="text-sm text-ink-muted">You can now sign in with your new password.</p>
            <Button className="mt-2 w-full" onClick={() => navigate("/login", { replace: true })}>
              Go to sign in
            </Button>
          </div>
        ) : !token ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <h1 className="font-display text-xl font-semibold text-ink">Invalid link</h1>
            <p className="text-sm text-ink-muted">This reset link is missing its token.</p>
            <Link to="/forgot-password" className="mt-2 text-sm text-accent-soft hover:underline">
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 font-display text-xl font-semibold text-ink">Set a new password</h1>
            <p className="mb-6 text-sm text-ink-muted">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="newPassword"
                type="password"
                label="New password"
                placeholder="At least 8 characters"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Confirm new password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
                Reset password
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
