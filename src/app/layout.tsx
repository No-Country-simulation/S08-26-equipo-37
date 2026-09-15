import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "PredictiveMaintenance",
  title: "Centro de operaciones | PredictiveMaintenance",
  description: "Command center industrial y experiencia móvil de alertas con datos simulados.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Predictive",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  initialScale: 1,
  themeColor: "#08111d",
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body>{children}</body>
    </html>
  );
}
