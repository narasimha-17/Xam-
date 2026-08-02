import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search...", className = "" }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 bg-base-soft/60 py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-ink-faint outline-none transition-all duration-200 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
