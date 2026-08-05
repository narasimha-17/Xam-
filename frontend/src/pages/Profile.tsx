import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Code2, Flame, Puzzle, Trophy, Zap } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { fetchProfileStats, updateProfile } from "../lib/api";
import { AVATAR_OPTIONS } from "../lib/avatars";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { UserAvatar } from "../components/ui/UserAvatar";
import type { EducationLevel, Gender } from "../types/api";

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  school: "School",
  college: "College student",
  engineering: "Engineering student",
};

export function Profile() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [rollNumber, setRollNumber] = useState(user?.roll_number ?? "");
  const [section, setSection] = useState(user?.section ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [institution, setInstitution] = useState(user?.institution ?? "");
  const [gender, setGender] = useState<Gender | "">(user?.gender ?? "");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">(user?.education_level ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [avatarSaving, setAvatarSaving] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ["profile-stats"], queryFn: fetchProfileStats });

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameMessage(null);

    if (
      !rollNumber.trim() ||
      !section.trim() ||
      !department.trim() ||
      !phoneNumber.trim() ||
      !location.trim() ||
      !institution.trim() ||
      !gender ||
      !educationLevel
    ) {
      setNameError(
        "Roll number, section, department, phone number, location, institution, gender, and education level are all required.",
      );
      return;
    }

    setNameSaving(true);
    try {
      const updated = await updateProfile({
        full_name: fullName,
        roll_number: rollNumber,
        section,
        department,
        phone_number: phoneNumber,
        location,
        institution,
        gender,
        education_level: educationLevel,
      });
      setUser(updated);
      setNameMessage("Profile updated.");
    } catch {
      setNameError("Could not update your profile. Try again.");
    } finally {
      setNameSaving(false);
    }
  }

  async function pickAvatar(avatarId: string) {
    setAvatarSaving(avatarId);
    try {
      const updated = await updateProfile({ avatar_id: avatarId });
      setUser(updated);
    } finally {
      setAvatarSaving(null);
    }
  }

  const statCards = stats
    ? [
        { icon: Puzzle, label: "Puzzles solved", value: stats.puzzles_solved, color: "text-accent" },
        { icon: Code2, label: "Coding questions solved", value: stats.coding_solved, color: "text-success" },
        { icon: Zap, label: "XP earned", value: stats.total_xp, color: "text-warning" },
        { icon: Flame, label: "Puzzle streak", value: stats.puzzle_current_streak, color: "text-danger" },
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update your account details. Roll number, section, department, gender, and education level must be filled
          in before you can take an exam — your education level also determines which subjects and exams you'll
          see.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <Card className="flex flex-col gap-4 lg:order-2 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink">Personal details</h2>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar fullName={fullName} avatarId={user?.avatar_id} size={44} />
              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Email" value={user?.email ?? ""} disabled />
              <Input
                label="Phone number"
                type="tel"
                placeholder="+91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Roll number"
                placeholder="e.g. 21CS1042"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
              />
              <Input
                label="Section"
                placeholder="e.g. A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Department"
                placeholder="e.g. Computer Science and Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
              <Input
                label="College / Institution"
                placeholder="e.g. IIT Madras"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)} required>
                <option value="" disabled>
                  Select gender
                </option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
              <Select
                label="Education level"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                required
              >
                <option value="" disabled>
                  Select education level
                </option>
                {(Object.entries(EDUCATION_LEVEL_LABELS) as [EducationLevel, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Location"
              placeholder="City, Country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            {nameError && <p className="text-sm text-danger">{nameError}</p>}
            {nameMessage && <p className="text-sm text-success">{nameMessage}</p>}
            <Button type="submit" isLoading={nameSaving} className="w-fit">
              Save changes
            </Button>
          </form>
        </Card>

        <div className="flex flex-col gap-6 lg:order-1">
          {stats && (
            <Card className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Trophy size={18} className="text-warning" /> Your activity
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {statCards.map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-black/10 p-3 text-center"
                  >
                    <Icon size={18} className={color} />
                    <span className="font-display text-xl font-semibold text-ink">{value}</span>
                    <span className="text-xs text-ink-muted">{label}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  <Award size={13} /> Badges
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {stats.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-xl border p-3",
                        badge.earned ? "border-success/30 bg-success/10" : "border-black/10 opacity-60",
                      )}
                    >
                      <span className={cn("text-sm font-medium", badge.earned ? "text-success" : "text-ink-muted")}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-ink-faint">{badge.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-semibold text-ink">Profile icon</h2>
            <p className="text-sm text-ink-muted">Pick an avatar to show instead of your initials.</p>
            <div className="grid grid-cols-6 gap-3">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  disabled={avatarSaving !== null}
                  onClick={() => pickAvatar(avatar.id)}
                  title={avatar.label}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all disabled:opacity-50",
                    user?.avatar_id === avatar.id ? "border-accent" : "border-transparent hover:border-black/10",
                  )}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: avatar.color }}
                  >
                    <avatar.icon size={20} />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
