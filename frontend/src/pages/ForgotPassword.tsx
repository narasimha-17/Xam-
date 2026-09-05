import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { sendPasswordResetEmail } from "firebase/auth";
import { MailCheck } from "lucide-react";
import { auth } from "../lib/firebase";
import { firebaseErrorMessage } from "../auth/firebaseError";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError(firebaseErrorMessage(err, "Something went wrong. Please try again."));
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

        {!sent ? (
          <>
            <h1 className="mb-1 font-display text-xl font-semibold text-ink">Forgot your password?</h1>
            <p className="mb-6 text-sm text-ink-muted">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
                Send reset link
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-ink-muted">
              <Link to="/login" className="text-accent-soft hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
              <MailCheck size={22} />
            </div>
            <h1 className="font-display text-xl font-semibold text-ink">Check your email</h1>
            <p className="text-sm text-ink-muted">
              If <span className="text-ink">{email}</span> is registered, a password reset link is on its way.
            </p>
            <Link to="/login" className="mt-2 w-full">
              <Button className="w-full">Back to sign in</Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
