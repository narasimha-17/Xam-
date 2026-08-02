import { useMemo } from "react";
import { Quote } from "lucide-react";

const QUOTES: { text: string; author: string }[] = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Practice like you've never won. Perform like you've never lost.", author: "Michael Jordan" },
  { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Well begun is half done.", author: "Aristotle" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
];

function pickQuote() {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return QUOTES[dayIndex % QUOTES.length];
}

export function QuoteBanner() {
  const quote = useMemo(pickQuote, []);

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent/[0.05] px-5 py-4">
      <Quote size={18} className="mt-0.5 shrink-0 text-accent" />
      <div>
        <p className="text-sm italic text-ink">"{quote.text}"</p>
        <p className="mt-1 text-xs text-ink-muted">— {quote.author}</p>
      </div>
    </div>
  );
}
