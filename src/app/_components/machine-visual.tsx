import type { ReactNode } from "react";

import type { Machine } from "@/features/maintenance/types";

const illustrations: Record<Machine["visual"], ReactNode> = {
  lathe: (
    <>
      <rect fill="var(--machine-body)" height="54" rx="5" width="54" x="30" y="48" />
      <circle cx="74" cy="70" fill="var(--machine-viewport)" r="17" stroke="var(--machine-accent)" strokeWidth="5" />
      <circle cx="74" cy="70" fill="var(--machine-detail)" r="5" />
      <path d="M91 70h76" stroke="var(--machine-edge)" strokeLinecap="round" strokeWidth="8" />
      <path d="M118 58v24l17 13" fill="none" stroke="var(--machine-warning)" strokeLinejoin="round" strokeWidth="5" />
      <path d="M159 52h29v50h-29l-13-18V70z" fill="var(--machine-panel)" stroke="var(--machine-edge)" strokeWidth="2" />
      <path d="M22 102h196v18H22zM42 120v13m154-13v13" fill="var(--machine-panel)" stroke="var(--machine-edge)" strokeWidth="3" />
    </>
  ),
  mill: (
    <>
      <path d="M42 116V34h45v82" fill="var(--machine-body)" stroke="var(--machine-edge)" strokeWidth="3" />
      <path d="M68 43h79v25H68z" fill="var(--machine-panel)" stroke="var(--machine-edge)" strokeWidth="3" />
      <path d="M131 68v30" stroke="var(--machine-accent)" strokeWidth="7" />
      <path d="m120 98 11 12 11-12" fill="var(--machine-warning)" />
      <path d="M67 93h122v18H67zM91 111v19m79-19v19" fill="var(--machine-body)" stroke="var(--machine-edge)" strokeWidth="3" />
      <path d="M25 132h193" stroke="var(--machine-base)" strokeLinecap="round" strokeWidth="6" />
    </>
  ),
  compressor: (
    <>
      <rect fill="var(--machine-body)" height="38" rx="19" stroke="var(--machine-edge)" strokeWidth="3" width="156" x="30" y="82" />
      <path d="M48 120v12m120-12v12" stroke="var(--machine-edge)" strokeWidth="5" />
      <rect fill="var(--machine-panel)" height="50" rx="6" stroke="var(--machine-edge)" strokeWidth="3" width="76" x="53" y="35" />
      <circle cx="91" cy="60" fill="var(--machine-viewport)" r="17" stroke="var(--machine-accent)" strokeWidth="4" />
      <path d="m91 46 5 11 11 3-11 5-5 10-4-10-11-5 11-3z" fill="var(--machine-accent)" />
      <path d="M130 52h34v30m0 0h24" fill="none" stroke="var(--machine-warning)" strokeLinecap="round" strokeWidth="5" />
      <circle cx="190" cy="82" fill="var(--machine-warning)" r="6" />
    </>
  ),
  "machining-center": (
    <>
      <rect fill="var(--machine-body)" height="106" rx="7" stroke="var(--machine-edge)" strokeWidth="3" width="176" x="32" y="25" />
      <path d="M44 38h85v75H44z" fill="var(--machine-viewport)" stroke="var(--machine-accent)" strokeWidth="3" />
      <path d="M57 48h59L75 101H57z" fill="var(--machine-glass)" opacity=".65" />
      <path d="M146 39h45v74h-45z" fill="var(--machine-panel)" />
      <circle cx="168" cy="57" fill="var(--machine-accent)" r="5" />
      <circle cx="168" cy="76" fill="var(--machine-warning)" r="5" />
      <path d="M86 42v43m-18 18h43" stroke="var(--machine-detail)" strokeLinecap="round" strokeWidth="5" />
      <path d="M48 131v8m143-8v8" stroke="var(--machine-edge)" strokeWidth="5" />
    </>
  ),
  hydraulic: (
    <>
      <rect fill="var(--machine-body)" height="38" rx="5" stroke="var(--machine-edge)" strokeWidth="3" width="153" x="43" y="96" />
      <rect fill="var(--machine-panel)" height="54" rx="5" stroke="var(--machine-edge)" strokeWidth="3" width="57" x="58" y="42" />
      <path d="M75 42V27h24v15M132 96V52h38v44" fill="none" stroke="var(--machine-accent)" strokeWidth="6" />
      <path d="M150 52V31" stroke="var(--machine-accent)" strokeWidth="6" />
      <circle cx="150" cy="27" fill="var(--machine-viewport)" r="15" stroke="var(--machine-warning)" strokeWidth="4" />
      <path d="m150 27 8-6" stroke="var(--machine-detail)" strokeLinecap="round" strokeWidth="3" />
      <path d="M43 116h153" stroke="var(--machine-accent)" strokeWidth="4" />
    </>
  ),
  auxiliary: (
    <>
      <rect fill="var(--machine-body)" height="91" rx="7" stroke="var(--machine-edge)" strokeWidth="3" width="144" x="48" y="35" />
      <circle cx="97" cy="80" fill="var(--machine-viewport)" r="31" stroke="var(--machine-accent)" strokeWidth="4" />
      <circle cx="97" cy="80" fill="var(--machine-accent)" r="7" />
      <path d="M97 73c-7-20 3-25 12-20 7 5 3 15-12 20Zm7 11c20-7 25 3 20 12-5 7-15 3-20-12Zm-14 4c-7 20-18 19-24 11-4-8 5-15 24-11Zm-1-14c-17-12-12-22-3-24 9-1 13 9 3 24Z" fill="var(--machine-accent)" opacity=".8" />
      <path d="M145 55h28m-28 18h28m-28 18h28m-28 18h18" stroke="var(--machine-edge)" strokeLinecap="round" strokeWidth="5" />
      <path d="M64 126v10m112-10v10" stroke="var(--machine-edge)" strokeWidth="5" />
    </>
  ),
};

export function MachineVisual({
  className = "",
  label,
  visual,
}: {
  className?: string;
  label: string;
  visual: Machine["visual"];
}) {
  return (
    <svg
      aria-label={`Ilustración de ${label}`}
      className={className}
      focusable="false"
      role="img"
      viewBox="0 0 240 150"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="var(--machine-canvas)" height="150" rx="12" width="240" />
      <path d="M16 32h208M16 76h208M16 120h208M56 16v118M120 16v118M184 16v118" stroke="var(--machine-edge)" strokeOpacity=".12" />
      {illustrations[visual]}
    </svg>
  );
}
