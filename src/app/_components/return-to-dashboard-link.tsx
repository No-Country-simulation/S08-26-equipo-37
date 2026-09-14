"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

const returnSourceSchema = z.enum([
  "desktop-attention",
  "desktop-alerts",
  "desktop-machines",
  "mobile-summary",
  "mobile-alerts",
  "mobile-machines",
  "mobile-activity",
]);

const returnPaths: Record<z.infer<typeof returnSourceSchema>, string> = {
  "desktop-attention": "/#desktop-attention",
  "desktop-alerts": "/#desktop-alerts",
  "desktop-machines": "/#desktop-machines",
  "mobile-summary": "/",
  "mobile-alerts": "/?view=alerts",
  "mobile-machines": "/?view=machines",
  "mobile-activity": "/?view=activity",
};

export function ReturnToDashboardLink({ children, className }: { children: ReactNode; className: string }) {
  const router = useRouter();

  return (
    <Link
      className={className}
      href="/"
      onNavigate={(event) => {
        const source = returnSourceSchema.safeParse(new URLSearchParams(window.location.search).get("from"));
        if (!source.success) return;
        event.preventDefault();
        router.push(returnPaths[source.data]);
      }}
    >
      {children}
    </Link>
  );
}
