import type { ReactNode } from "react";

import type { Machine } from "@/features/maintenance/types";

const illustrations: Record<Machine["visual"], ReactNode> = {
  lathe: (
    <>
      <rect fill="#dbe4e8" height="54" rx="5" width="54" x="30" y="48" />
      <circle cx="74" cy="70" fill="#f8fafc" r="17" stroke="#0f766e" strokeWidth="5" />
      <circle cx="74" cy="70" fill="#475569" r="5" />
      <path d="M91 70h76" stroke="#64748b" strokeLinecap="round" strokeWidth="8" />
      <path d="M118 58v24l17 13" fill="none" stroke="#b45309" strokeLinejoin="round" strokeWidth="5" />
      <path d="M159 52h29v50h-29l-13-18V70z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
      <path d="M22 102h196v18H22zM42 120v13m154-13v13" fill="#cbd5e1" stroke="#64748b" strokeWidth="3" />
    </>
  ),
  mill: (
    <>
      <path d="M42 116V34h45v82" fill="#dbe4e8" stroke="#64748b" strokeWidth="3" />
      <path d="M68 43h79v25H68z" fill="#cbd5e1" stroke="#64748b" strokeWidth="3" />
      <path d="M131 68v30" stroke="#0f766e" strokeWidth="7" />
      <path d="m120 98 11 12 11-12" fill="#b45309" />
      <path d="M67 93h122v18H67zM91 111v19m79-19v19" fill="#dbe4e8" stroke="#64748b" strokeWidth="3" />
      <path d="M25 132h193" stroke="#334155" strokeLinecap="round" strokeWidth="6" />
    </>
  ),
  compressor: (
    <>
      <rect fill="#dbe4e8" height="38" rx="19" stroke="#64748b" strokeWidth="3" width="156" x="30" y="82" />
      <path d="M48 120v12m120-12v12" stroke="#64748b" strokeWidth="5" />
      <rect fill="#cbd5e1" height="50" rx="6" stroke="#64748b" strokeWidth="3" width="76" x="53" y="35" />
      <circle cx="91" cy="60" fill="#f8fafc" r="17" stroke="#0f766e" strokeWidth="4" />
      <path d="m91 46 5 11 11 3-11 5-5 10-4-10-11-5 11-3z" fill="#0f766e" />
      <path d="M130 52h34v30m0 0h24" fill="none" stroke="#b45309" strokeLinecap="round" strokeWidth="5" />
      <circle cx="190" cy="82" fill="#b45309" r="6" />
    </>
  ),
  "machining-center": (
    <>
      <rect fill="#dbe4e8" height="106" rx="7" stroke="#64748b" strokeWidth="3" width="176" x="32" y="25" />
      <path d="M44 38h85v75H44z" fill="#f8fafc" stroke="#0f766e" strokeWidth="3" />
      <path d="M57 48h59L75 101H57z" fill="#99c9c5" opacity=".65" />
      <path d="M146 39h45v74h-45z" fill="#cbd5e1" />
      <circle cx="168" cy="57" fill="#0f766e" r="5" />
      <circle cx="168" cy="76" fill="#b45309" r="5" />
      <path d="M86 42v43m-18 18h43" stroke="#475569" strokeLinecap="round" strokeWidth="5" />
      <path d="M48 131v8m143-8v8" stroke="#64748b" strokeWidth="5" />
    </>
  ),
  hydraulic: (
    <>
      <rect fill="#dbe4e8" height="38" rx="5" stroke="#64748b" strokeWidth="3" width="153" x="43" y="96" />
      <rect fill="#cbd5e1" height="54" rx="5" stroke="#64748b" strokeWidth="3" width="57" x="58" y="42" />
      <path d="M75 42V27h24v15M132 96V52h38v44" fill="none" stroke="#0f766e" strokeWidth="6" />
      <path d="M150 52V31" stroke="#0f766e" strokeWidth="6" />
      <circle cx="150" cy="27" fill="#f8fafc" r="15" stroke="#b45309" strokeWidth="4" />
      <path d="m150 27 8-6" stroke="#475569" strokeLinecap="round" strokeWidth="3" />
      <path d="M43 116h153" stroke="#0f766e" strokeWidth="4" />
    </>
  ),
  auxiliary: (
    <>
      <rect fill="#dbe4e8" height="91" rx="7" stroke="#64748b" strokeWidth="3" width="144" x="48" y="35" />
      <circle cx="97" cy="80" fill="#f8fafc" r="31" stroke="#0f766e" strokeWidth="4" />
      <circle cx="97" cy="80" fill="#0f766e" r="7" />
      <path d="M97 73c-7-20 3-25 12-20 7 5 3 15-12 20Zm7 11c20-7 25 3 20 12-5 7-15 3-20-12Zm-14 4c-7 20-18 19-24 11-4-8 5-15 24-11Zm-1-14c-17-12-12-22-3-24 9-1 13 9 3 24Z" fill="#0f766e" opacity=".8" />
      <path d="M145 55h28m-28 18h28m-28 18h28m-28 18h18" stroke="#64748b" strokeLinecap="round" strokeWidth="5" />
      <path d="M64 126v10m112-10v10" stroke="#64748b" strokeWidth="5" />
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
      <rect fill="#f1f5f9" height="150" rx="12" width="240" />
      <path d="M16 32h208M16 76h208M16 120h208M56 16v118M120 16v118M184 16v118" stroke="#64748b" strokeOpacity=".12" />
      {illustrations[visual]}
    </svg>
  );
}
