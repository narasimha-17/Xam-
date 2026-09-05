const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/network-request-failed": "Network error — check your connection and try again.",
};

export function firebaseErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail ?? fallback;
}
