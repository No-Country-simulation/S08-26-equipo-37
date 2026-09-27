"use client";

import { useState } from "react";
import { MachineVisual } from "@/app/_components/machine-visual";
import type { Machine } from "@/features/maintenance/types";

export function MachineImage({ image, visual, label, className = "" }: {
  image?: { url: string; alt: string } | null;
  visual: Machine["visual"];
  label: string;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!image || failedUrl === image.url) return <MachineVisual className={className} label={label} visual={visual} />;

  // External images load directly in the browser; never send arbitrary URLs through the server image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={image.alt} className={`object-cover ${className}`} loading="lazy" onError={() => setFailedUrl(image.url)} referrerPolicy="no-referrer" src={image.url} />;
}
