import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, BookOpen, GraduationCap, Laptop } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [institution, setInstitution] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        full_name: fullName,
        phone_number: phoneNumber,
        location,
        institution,
      });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Could not create account.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
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
            <h2 className="font-display text-2xl font-semibold text-ink">Join Xam+.</h2>
            <p className="mt-2 max-w-xs text-sm text-ink-muted">
              Practice exams, track your progress, and earn badges as you master every engineering subject.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="flex w-full flex-col overflow-y-auto bg-base-panel px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mx-auto my-auto w-full max-w-sm"
        >
          <Logo className="mb-10 text-xl" />
          <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Create your account</h1>
          <p className="mb-8 text-sm text-ink-muted">Start practicing engineering subjects today.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="fullName"
              label="Full name"
              placeholder="Ada Lovelace"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="phoneNumber"
              type="tel"
              label="Phone number"
              placeholder="+91 98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <Input
              id="location"
              label="Location"
              placeholder="City, Country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <Input
              id="institution"
              label="College / Institution"
              placeholder="e.g. IIT Madras"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
            />
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="At least 8 characters"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
              Create account
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-accent-soft hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
