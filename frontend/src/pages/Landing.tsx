import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Code2, FileText, MessagesSquare, Star, TrendingUp, Zap } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Logo } from "../components/ui/Logo";
import { HeroIllustration } from "../components/landing/HeroIllustration";

const ROTATING_SUBJECTS = ["Data Structures", "Machine Learning", "Computer Networks", "DBMS", "Deep Learning"];

const FOUNDERS = [
  { name: "Narasimha", role: "Founder", color: "#1e3f66" },
  { name: "Manas Chintalapudi", role: "Co-Founder", color: "#e8a23d" },
];

const FOOTER_COLUMNS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: "Practice",
    links: [
      { label: "Subjects", to: "/subjects" },
      { label: "Coding practice", to: "/coding" },
      { label: "Dev Practice", to: "/dev-practice" },
      { label: "Mock interview", to: "/mock-interview" },
      { label: "Company Interview Bank", to: "/companies" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Xipe Community", to: "/discussion" },
      { label: "Daily puzzle", to: "/puzzle" },
      { label: "Live competition", to: "/competitions" },
      { label: "Progress", to: "/progress" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "Study planner", to: "/planner" },
    ],
  },
];

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    quote: "This platform helped me stay consistent with daily practice before my placement season.",
  },
  {
    rating: 5,
    quote: "The coding practice and AI mock interview combo is exactly what I needed for technical rounds.",
  },
  {
    rating: 4,
    quote: "The gamified Git and Docker practice made a boring topic actually fun to learn.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Practice exams",
    description: "Timed MCQ, MAQ, match-the-following, and fill-in-the-blank questions with instant, per-question feedback.",
  },
  {
    icon: Code2,
    title: "Coding questions",
    description: "LeetCode-style problems in Python, Java, or C++ — write, run against sample tests, then submit for grading.",
  },
  {
    icon: FileText,
    title: "PDF library",
    description: "Reference notes and study material organized by subject, ready to read whenever you need them.",
  },
  {
    icon: MessagesSquare,
    title: "Discussion",
    description: "Ask questions and get help from peers and instructors on anything you're stuck on.",
  },
  {
    icon: TrendingUp,
    title: "Progress tracking",
    description: "See your accuracy by subject over time, so you always know what to practice next.",
  },
  {
    icon: BookOpen,
    title: "Built for engineering",
    description: "Subjects, exams, and material organized the way engineering coursework actually works.",
  },
];

const STEPS = [
  { step: "01", title: "Pick a subject", description: "Browse subjects your instructor has set up, each with its own exams and material." },
  { step: "02", title: "Practice", description: "Take a timed exam, run and submit code, or read through reference PDFs." },
  { step: "03", title: "Track progress", description: "See instant results and a running accuracy trend so you know where to focus." },
];

function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % ROTATING_SUBJECTS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden align-bottom text-accent">
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_SUBJECTS[index]}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline-block whitespace-nowrap"
        >
          {ROTATING_SUBJECTS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Landing() {
  return (
    <div className="relative min-h-screen">
      <div className="app-backdrop">
        <div className="bg-grid" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo className="text-xl" />
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-2 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-start gap-6 text-left"
          >
            <h1 className="max-w-xl font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
              Practice <RotatingWord /> like the exam is tomorrow.
            </h1>
            <p className="max-w-lg text-lg text-ink-muted">
              Timed exams, coding problems, study PDFs, peer discussion, and progress tracking — all in one place
              built for engineering students.
            </p>
            <div className="flex items-center gap-3">
              <Link to="/register">
                <Button className="px-6 py-3 text-base">Start practicing free</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="px-6 py-3 text-base">
                  I have an account
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="relative flex items-center justify-center px-6 py-4"
          >
            <HeroIllustration />
          </motion.div>
        </section>

        <section className="py-16">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Everything you need to practice</h2>
            <p className="mt-2 text-ink-muted">One platform, five ways to prepare.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
                  <p className="text-sm text-ink-muted">{description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">How it works</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="flex flex-col gap-2">
                <span className="font-display text-3xl font-bold text-accent/30">{step}</span>
                <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
                <p className="text-sm text-ink-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="mb-2 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">What students are saying</h2>
            <p className="mt-2 text-xs uppercase tracking-wide text-ink-faint">
              Sample reviews — real testimonials coming soon
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SAMPLE_REVIEWS.map(({ rating, quote }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} className={n <= rating ? "fill-warning text-warning" : "text-black/15"} />
                    ))}
                  </div>
                  <p className="text-sm text-ink-muted">&ldquo;{quote}&rdquo;</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Built by</h2>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {FOUNDERS.map(({ name, role, color }) => (
              <Card key={name} className="flex w-full max-w-xs flex-col items-center gap-3 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-lg font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-ink">{name}</p>
                  <p className="text-xs text-ink-faint">{role}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-16">
          <Card className="flex flex-col items-center gap-4 py-14 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Ready to practice?</h2>
            <p className="max-w-md text-ink-muted">Create a free account and take your first practice exam in minutes.</p>
            <Link to="/register">
              <Button className="px-6 py-3 text-base">Get started</Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-black/10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Logo className="text-base" />
            <p className="max-w-xs text-sm text-ink-muted">
              Timed exams, coding problems, study PDFs, peer discussion, and progress tracking — all in one place
              built for engineering students.
            </p>
          </div>

          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <div key={heading} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{heading}</h3>
              <ul className="flex flex-col gap-2">
                {links.map(({ label, to }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-ink-muted hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-black/10 px-6 py-6 text-xs text-ink-faint sm:flex-row">
          <p>© {new Date().getFullYear()} Xam+. All rights reserved.</p>
          <p>Built by Narasimha &amp; Manas Chintalapudi</p>
        </div>
      </footer>
    </div>
  );
}
