import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api";
import { ProfileForm } from "@/components/conta/profile-form";

export const metadata: Metadata = {
  title: "Dados pessoais",
};

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      phone: true,
      cpf: true,
      birthDate: true,
      gender: true,
      newsletter: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dados pessoais</h1>
      <ProfileForm
        initial={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          cpf: user.cpf,
          birthDate: user.birthDate ? user.birthDate.toISOString() : null,
          gender: user.gender,
          newsletter: user.newsletter,
        }}
      />
    </div>
  );
}
