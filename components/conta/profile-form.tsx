"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { onlyDigits } from "@/lib/br";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/dictionaries";

type ProfileData = {
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  birthDate: string | null;
  gender: string | null;
  newsletter: boolean;
};

function formatPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

const GENDERS = [
  { value: "F", labelKey: "genderF" },
  { value: "M", labelKey: "genderM" },
  { value: "O", labelKey: "genderO" },
  { value: "N", labelKey: "genderN" },
] as const;

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const { update } = useSession();
  const { t } = useI18n();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [cpf, setCpf] = useState(initial.cpf ?? "");
  const [birthDate, setBirthDate] = useState(initial.birthDate?.slice(0, 10) ?? "");
  const [gender, setGender] = useState(initial.gender ?? "");
  const [newsletter, setNewsletter] = useState(initial.newsletter);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: onlyDigits(phone) || undefined,
          cpf: onlyDigits(cpf) || undefined,
          birthDate: birthDate || undefined,
          gender: gender || undefined,
          newsletter,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t.account.profileSaveError);
        return;
      }
      await update({ name });
      toast.success(t.account.profileSaved);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t.account.newPasswordMin);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t.auth.passwordMismatch);
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t.account.passwordChangeError);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t.account.passwordChanged);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.account.personalDataTitle}</CardTitle>
          <CardDescription>{t.account.profileDataDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.auth.name}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input id="email" value={initial.email} disabled className="opacity-70" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t.auth.phone}</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpf">{t.auth.cpf}</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthDate">{t.account.birthDate}</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">{t.account.gender}</Label>
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v ?? "")}
                  items={GENDERS.map((g) => ({ label: t.account[g.labelKey], value: g.value }))}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue className="pr-6">
                      {GENDERS.find((g) => g.value === gender)?.labelKey
                        ? t.account[GENDERS.find((g) => g.value === gender)!.labelKey]
                        : t.account.selectPlaceholder}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {t.account[g.labelKey]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={newsletter}
                onCheckedChange={(v) => setNewsletter(!!v)}
              />
              {t.account.newsletterOptInProfile}
            </label>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t.account.saveChanges}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.account.changePasswordTitle}</CardTitle>
          <CardDescription>{t.account.changePasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">{t.account.currentPassword}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">{t.auth.newPassword}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t.auth.confirmNewPassword}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={savingPassword} variant="outline">
              {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t.account.changePassword}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
