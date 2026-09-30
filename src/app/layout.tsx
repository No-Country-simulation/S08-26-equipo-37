import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/modules/identity/auth";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "PredictiveMaintenance",
  title: "Centro de operaciones | PredictiveMaintenance",
  description: "Command center industrial y experiencia móvil de alertas con datos simulados.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Predictive",
  },
  formatDetection: {
    telephone: false,
  },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = (await getCurrentUser())?.theme ?? "light";
  return {
    colorScheme: theme,
    initialScale: 1,
    themeColor: theme === "dark" ? "#07111f" : "#ffffff",
    viewportFit: "cover",
    width: "device-width",
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const theme = (await getCurrentUser())?.theme ?? "light";
  return (
    <html data-scroll-behavior="smooth" data-theme={theme} lang="es">
      <body>{children}</body>
    </html>
  );
}
