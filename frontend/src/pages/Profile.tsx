import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateProfile } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

export function Profile() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [institution, setInstitution] = useState(user?.institution ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameMessage(null);

    if (!phoneNumber.trim() || !location.trim() || !institution.trim()) {
      setNameError("Phone number, location, and institution are all required.");
      return;
    }

    setNameSaving(true);
    try {
      const updated = await updateProfile({
        full_name: fullName,
        phone_number: phoneNumber,
        location,
        institution,
      });
      setUser(updated);
      setNameMessage("Profile updated.");
    } catch {
      setNameError("Could not update your profile. Try again.");
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await updateProfile({ current_password: currentPassword, new_password: newPassword });
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Could not update your password.";
      setPasswordError(message);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink-muted">Update your account details.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-ink">Personal details</h2>
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" value={user?.email ?? ""} disabled />
          <Input
            label="Phone number"
            type="tel"
            placeholder="+91 98765 43210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
          <Input
            label="Location"
            placeholder="City, Country"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <Input
            label="College / Institution"
            placeholder="e.g. IIT Madras"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            required
          />
          {nameError && <p className="text-sm text-danger">{nameError}</p>}
          {nameMessage && <p className="text-sm text-success">{nameMessage}</p>}
          <Button type="submit" isLoading={nameSaving} className="w-fit">
            Save changes
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-ink">Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
          {passwordMessage && <p className="text-sm text-success">{passwordMessage}</p>}
          <Button type="submit" isLoading={passwordSaving} className="w-fit">
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
