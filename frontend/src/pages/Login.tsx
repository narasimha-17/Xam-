import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, BookOpen, GraduationCap, Laptop } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex w-full flex-col overflow-y-auto bg-base-panel px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mx-auto my-auto w-full max-w-sm"
        >
          <Logo className="mb-10 text-xl" />
          <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Welcome back</h1>
          <p className="mb-8 text-sm text-ink-muted">Sign in to continue practicing.</p>
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
            <div className="flex flex-col gap-1.5">
              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Link to="/forgot-password" className="self-end text-xs text-accent-soft hover:underline">
                Forgot password?
              </Link>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-muted">
            New to Xam+?{" "}
            <Link to="/register" className="text-accent-soft hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-accent-soft/10 lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative flex flex-col items-center gap-8 px-12 text-center"
        >
          <div className="relative flex h-64 w-64 items-center justify-center rounded-full bg-base-panel shadow-glow-lg">
            <GraduationCap size={88} className="text-accent" strokeWidth={1.25} />
            <div className="absolute -left-4 -top-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft/15 shadow-glow">
              <BookOpen size={26} className="text-accent-soft" />
            </div>
            <div className="absolute -right-6 top-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 shadow-glow">
              <Laptop size={26} className="text-accent" />
            </div>
            <div className="absolute -bottom-3 left-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 shadow-glow">
              <Award size={26} className="text-warning" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Practice smarter.</h2>
            <p className="mt-2 max-w-xs text-sm text-ink-muted">
              Timed exams, proctoring, AI-drafted questions, and progress tracking — everything for engineering
              practice in one place.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
