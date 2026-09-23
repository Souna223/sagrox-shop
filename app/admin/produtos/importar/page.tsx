import type { Metadata } from "next";
import { requireAdmin } from "@/lib/api";
import ProductImportForm from "@/components/admin/product-import-form";
import { ProductUrlImportForm } from "@/components/admin/product-url-import-form";

export const metadata: Metadata = {
  title: "Importar produto",
};

export default async function AdminProductImportPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importe por link (rascunho) ou vários produtos de uma vez enviando um arquivo CSV.
        </p>
      </div>
      <ProductUrlImportForm />
      <ProductImportForm />
    </div>
  );
}
