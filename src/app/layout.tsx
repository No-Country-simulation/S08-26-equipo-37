import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Centro de mantenimiento | PredictiveMaintenance",
  description: "Maqueta del tablero de priorización para mantenimiento industrial.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body>{children}</body>
    </html>
  );
}
