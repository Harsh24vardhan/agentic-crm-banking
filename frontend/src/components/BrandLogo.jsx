import React from "react";

export default function BrandLogo({ size = 40, animated = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animated ? "brand-logo-mark" : ""}
      role="img"
      aria-label="Agentic AI System logo"
    >
      <defs>
        <linearGradient id="brandLogoBg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-purple)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#brandLogoBg)" fillOpacity="0.16" stroke="url(#brandLogoBg)" strokeWidth="1.5" />
      <g stroke="url(#brandLogoBg)" strokeWidth="1.6" strokeLinecap="round">
        <line x1="24" y1="14" x2="15" y2="27" />
        <line x1="24" y1="14" x2="33" y2="27" />
        <line x1="15" y1="27" x2="33" y2="27" />
        <line x1="24" y1="14" x2="24" y2="34" />
        <line x1="15" y1="27" x2="24" y2="34" />
        <line x1="33" y1="27" x2="24" y2="34" />
      </g>
      <circle cx="24" cy="14" r="3.4" fill="var(--bg-primary)" stroke="url(#brandLogoBg)" strokeWidth="1.6" />
      <circle cx="15" cy="27" r="3.4" fill="var(--bg-primary)" stroke="url(#brandLogoBg)" strokeWidth="1.6" />
      <circle cx="33" cy="27" r="3.4" fill="var(--bg-primary)" stroke="url(#brandLogoBg)" strokeWidth="1.6" />
      <circle cx="24" cy="34" r="3.8" fill="url(#brandLogoBg)" />
    </svg>
  );
}
