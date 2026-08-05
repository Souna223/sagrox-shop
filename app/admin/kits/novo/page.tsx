import type { Metadata } from "next";
import { KitForm } from "@/components/admin/kit-form";

export const metadata: Metadata = {
  title: "Novo kit",
};

export default function NewKitPage() {
  return <KitForm />;
}
