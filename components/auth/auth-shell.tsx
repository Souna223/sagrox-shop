import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-6 flex justify-center" aria-label={SITE_NAME}>
        <Image
          src="/logo.png"
          alt={SITE_NAME}
          width={1406}
          height={768}
          className="h-12 w-auto object-contain"
          priority
        />
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="pt-4">{children}</CardContent>
      </Card>
    </div>
  );
}
