import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateProfile } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

export function Profile() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [rollNumber, setRollNumber] = useState(user?.roll_number ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [institution, setInstitution] = useState(user?.institution ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameMessage(null);

    if (!rollNumber.trim() || !phoneNumber.trim() || !location.trim() || !institution.trim()) {
      setNameError("Roll number, phone number, location, and institution are all required.");
      return;
    }

    setNameSaving(true);
    try {
      const updated = await updateProfile({
        full_name: fullName,
        roll_number: rollNumber,
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
            label="Roll number"
            placeholder="e.g. 21CS1042"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            required
          />
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
    </div>
  );
}
