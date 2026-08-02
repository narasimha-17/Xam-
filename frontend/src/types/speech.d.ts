// Minimal ambient types for the (non-standardized) Web Speech recognition API —
// SpeechSynthesis/SpeechSynthesisUtterance are already part of lib.dom.d.ts, but
// SpeechRecognition is Chrome-prefixed and not in TypeScript's DOM lib.
interface SpeechRecognitionResultLike {
  [index: number]: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: { [index: number]: SpeechRecognitionResultLike; length: number };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}
