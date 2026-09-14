import type { ReactNode } from "react";

import type { Machine } from "@/features/maintenance/types";

const illustrations: Record<Machine["visual"], ReactNode> = {
  lathe: (
    <>
      <rect fill="#132a3f" height="54" rx="5" width="54" x="30" y="48" />
      <circle cx="74" cy="70" fill="#07111f" r="17" stroke="#5eead4" strokeWidth="5" />
      <circle cx="74" cy="70" fill="#f8fafc" r="5" />
      <path d="M91 70h76" stroke="#94a3b8" strokeLinecap="round" strokeWidth="8" />
      <path d="M118 58v24l17 13" fill="none" stroke="#fbbf24" strokeLinejoin="round" strokeWidth="5" />
      <path d="M159 52h29v50h-29l-13-18V70z" fill="#19344c" stroke="#64748b" strokeWidth="2" />
      <path d="M22 102h196v18H22zM42 120v13m154-13v13" fill="#1e3a52" stroke="#64748b" strokeWidth="3" />
    </>
  ),
  mill: (
    <>
      <path d="M42 116V34h45v82" fill="#173148" stroke="#64748b" strokeWidth="3" />
      <path d="M68 43h79v25H68z" fill="#1e405b" stroke="#64748b" strokeWidth="3" />
      <path d="M131 68v30" stroke="#5eead4" strokeWidth="7" />
      <path d="m120 98 11 12 11-12" fill="#fbbf24" />
      <path d="M67 93h122v18H67zM91 111v19m79-19v19" fill="#132a3f" stroke="#64748b" strokeWidth="3" />
      <path d="M25 132h193" stroke="#334155" strokeLinecap="round" strokeWidth="6" />
    </>
  ),
  compressor: (
    <>
      <rect fill="#173148" height="38" rx="19" stroke="#64748b" strokeWidth="3" width="156" x="30" y="82" />
      <path d="M48 120v12m120-12v12" stroke="#64748b" strokeWidth="5" />
      <rect fill="#1e405b" height="50" rx="6" stroke="#64748b" strokeWidth="3" width="76" x="53" y="35" />
      <circle cx="91" cy="60" fill="#07111f" r="17" stroke="#5eead4" strokeWidth="4" />
      <path d="m91 46 5 11 11 3-11 5-5 10-4-10-11-5 11-3z" fill="#5eead4" />
      <path d="M130 52h34v30m0 0h24" fill="none" stroke="#fbbf24" strokeLinecap="round" strokeWidth="5" />
      <circle cx="190" cy="82" fill="#fbbf24" r="6" />
    </>
  ),
  "machining-center": (
    <>
      <rect fill="#152d43" height="106" rx="7" stroke="#64748b" strokeWidth="3" width="176" x="32" y="25" />
      <path d="M44 38h85v75H44z" fill="#0a1c2d" stroke="#5eead4" strokeWidth="3" />
      <path d="M57 48h59L75 101H57z" fill="#164e63" opacity=".65" />
      <path d="M146 39h45v74h-45z" fill="#1e405b" />
      <circle cx="168" cy="57" fill="#5eead4" r="5" />
      <circle cx="168" cy="76" fill="#fbbf24" r="5" />
      <path d="M86 42v43m-18 18h43" stroke="#cbd5e1" strokeLinecap="round" strokeWidth="5" />
      <path d="M48 131v8m143-8v8" stroke="#64748b" strokeWidth="5" />
    </>
  ),
  hydraulic: (
    <>
      <rect fill="#173148" height="38" rx="5" stroke="#64748b" strokeWidth="3" width="153" x="43" y="96" />
      <rect fill="#1e405b" height="54" rx="5" stroke="#64748b" strokeWidth="3" width="57" x="58" y="42" />
      <path d="M75 42V27h24v15M132 96V52h38v44" fill="none" stroke="#5eead4" strokeWidth="6" />
      <path d="M150 52V31" stroke="#5eead4" strokeWidth="6" />
      <circle cx="150" cy="27" fill="#07111f" r="15" stroke="#fbbf24" strokeWidth="4" />
      <path d="m150 27 8-6" stroke="#f8fafc" strokeLinecap="round" strokeWidth="3" />
      <path d="M43 116h153" stroke="#0f766e" strokeWidth="4" />
    </>
  ),
  auxiliary: (
    <>
      <rect fill="#173148" height="91" rx="7" stroke="#64748b" strokeWidth="3" width="144" x="48" y="35" />
      <circle cx="97" cy="80" fill="#07111f" r="31" stroke="#5eead4" strokeWidth="4" />
      <circle cx="97" cy="80" fill="#5eead4" r="7" />
      <path d="M97 73c-7-20 3-25 12-20 7 5 3 15-12 20Zm7 11c20-7 25 3 20 12-5 7-15 3-20-12Zm-14 4c-7 20-18 19-24 11-4-8 5-15 24-11Zm-1-14c-17-12-12-22-3-24 9-1 13 9 3 24Z" fill="#67e8f9" opacity=".8" />
      <path d="M145 55h28m-28 18h28m-28 18h28m-28 18h18" stroke="#94a3b8" strokeLinecap="round" strokeWidth="5" />
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
      <rect fill="#091827" height="150" rx="12" width="240" />
      <path d="M16 32h208M16 76h208M16 120h208M56 16v118M120 16v118M184 16v118" stroke="#94a3b8" strokeOpacity=".08" />
      {illustrations[visual]}
    </svg>
  );
}
