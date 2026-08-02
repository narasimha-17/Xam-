import { motion } from "framer-motion";
import { BookOpen, Clock3 } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: "400 / 300" }}>
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-2 top-0 flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/15 shadow-glow"
      >
        <Clock3 size={20} className="text-warning" strokeWidth={1.75} />
      </motion.div>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className="absolute -right-2 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 shadow-glow"
      >
        <BookOpen size={20} className="text-accent" strokeWidth={1.75} />
      </motion.div>

      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="200" cy="240" rx="150" ry="8" className="fill-ink/5" />

        {/* desk */}
        <rect x="20" y="200" width="360" height="8" rx="2" className="fill-accent-soft/50" />
        <rect x="20" y="208" width="360" height="30" className="fill-base-soft" />
        <rect x="45" y="238" width="12" height="16" rx="2" className="fill-base-soft" />
        <rect x="343" y="238" width="12" height="16" rx="2" className="fill-base-soft" />

        {/* laptop — wide screen + flat keyboard base, sitting on the desk */}
        <path d="M148 188 L252 188 L264 203 L136 203 Z" className="fill-ink/75" />
        <rect x="145" y="118" width="110" height="72" rx="6" className="fill-ink" />
        <rect x="152" y="125" width="96" height="58" rx="3" className="fill-base-panel" />
        <motion.rect
          x="164"
          y="150"
          width="18"
          height="3"
          rx="1.5"
          className="fill-accent/50"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
