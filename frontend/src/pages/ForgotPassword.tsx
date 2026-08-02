import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, MailCheck } from "lucide-react";
import { forgotPassword, resetPassword } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";

type Step = "email" | "otp" | "done";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setStep("otp");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      setSendError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
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
      await resetPassword(email, otp, newPassword);
      setStep("done");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "That code is invalid or has expired.";
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

        {step === "email" && (
          <>
            <h1 className="mb-1 font-display text-xl font-semibold text-ink">Forgot your password?</h1>
            <p className="mb-6 text-sm text-ink-muted">Enter your email and we'll send you a 6-digit code.</p>
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {sendError && <p className="text-sm text-danger">{sendError}</p>}
              <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
                Send code
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-ink-muted">
              <Link to="/login" className="text-accent-soft hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
                <MailCheck size={22} />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-ink">Check your email</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  If <span className="text-ink">{email}</span> is registered, a 6-digit code has been sent. It
                  expires in 60 minutes.
                </p>
              </div>
            </div>
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                label="6-digit code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
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
              <Button type="submit" isLoading={isLoading} disabled={otp.length !== 6} className="mt-2 w-full">
                Reset password
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-ink-muted">
              Didn't get a code?{" "}
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-accent-soft hover:underline"
              >
                Try again
              </button>
            </p>
          </>
        )}

        {step === "done" && (
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
        )}
      </motion.div>
    </div>
  );
}
