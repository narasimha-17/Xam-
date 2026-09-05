from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.user import EducationLevel, Gender, UserRole

# Preset avatar identifiers a student can pick for their profile icon. Kept as a plain string
# set (not a DB enum) so new avatars can be added later without a migration.
AVATAR_IDS = {
    "rocket",
    "owl",
    "cat",
    "dog",
    "ghost",
    "star",
    "bolt",
    "flame",
    "waves",
    "sparkles",
    "rabbit",
    "turtle",
}


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    roll_number: str | None
    section: str | None
    department: str | None
    phone_number: str | None
    location: str | None
    institution: str | None
    gender: Gender | None
    education_level: EducationLevel | None
    avatar_id: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    roll_number: str | None = None
    section: str | None = None
    department: str | None = None
    phone_number: str | None = None
    location: str | None = None
    institution: str | None = None
    gender: Gender | None = None
    education_level: EducationLevel | None = None
    avatar_id: str | None = None

    @field_validator("avatar_id")
    @classmethod
    def valid_avatar(cls, v: str | None) -> str | None:
        if v is not None and v not in AVATAR_IDS:
            raise ValueError("Unknown avatar")
        return v


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserActiveUpdate(BaseModel):
    is_active: bool


class AdminResetPasswordOut(BaseModel):
    temporary_password: str


class BadgeOut(BaseModel):
    id: str
    label: str
    description: str
    earned: bool


class ProfileStatsOut(BaseModel):
    puzzles_solved: int
    puzzle_current_streak: int
    puzzle_longest_streak: int
    coding_solved: int
    exams_completed: int
    total_xp: int
    badges: list[BadgeOut]
