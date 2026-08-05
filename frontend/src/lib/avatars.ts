import { Bird, Cat, Dog, Flame, Ghost, Rabbit, Rocket, Sparkles, Star, Turtle, Waves, Zap, type LucideIcon } from "lucide-react";

export interface AvatarOption {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

// Must match the AVATAR_IDS set in backend/app/schemas/user.py.
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "rocket", label: "Rocket", icon: Rocket, color: "#1e3f66" },
  { id: "owl", label: "Owl", icon: Bird, color: "#2e9e6b" },
  { id: "cat", label: "Cat", icon: Cat, color: "#e8a23d" },
  { id: "dog", label: "Dog", icon: Dog, color: "#b8862e" },
  { id: "ghost", label: "Ghost", icon: Ghost, color: "#8b96a6" },
  { id: "star", label: "Star", icon: Star, color: "#dba63f" },
  { id: "bolt", label: "Bolt", icon: Zap, color: "#0a192f" },
  { id: "flame", label: "Flame", icon: Flame, color: "#d1495b" },
  { id: "waves", label: "Waves", icon: Waves, color: "#3f74ab" },
  { id: "sparkles", label: "Sparkles", icon: Sparkles, color: "#6a4c93" },
  { id: "rabbit", label: "Rabbit", icon: Rabbit, color: "#45a29e" },
  { id: "turtle", label: "Turtle", icon: Turtle, color: "#3d8f6b" },
];

export function findAvatar(avatarId: string | null | undefined): AvatarOption | undefined {
  return AVATAR_OPTIONS.find((a) => a.id === avatarId);
}
