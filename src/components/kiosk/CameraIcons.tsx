"use client";

import type { CSSProperties } from "react";

// Icone camera in stile SF Symbols — stroke unico, coerente, niente emoji.
// Usate solo nella schermata selfie (viewfinder in stile fotocamera iOS).

type IconProps = { className?: string; style?: CSSProperties };

export function CameraIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M4 8.5C4 7.67157 4.67157 7 5.5 7H7.5L8.6 5.35C8.88 4.925 9.35 4.667 9.86 4.667H14.14C14.65 4.667 15.12 4.925 15.4 5.35L16.5 7H18.5C19.3284 7 20 7.67157 20 8.5V17.5C20 18.3284 19.3284 19 18.5 19H5.5C4.67157 19 4 18.3284 4 17.5V8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ImageIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 16.5L9.5 12.5C10 12.05 10.7 12.05 11.2 12.5L14 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14L15.3 11.9C15.8 11.45 16.5 11.45 17 11.9L19 13.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M5 12.5L9.5 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M19 5.5V9.5H15M5 18.5V14.5H9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 12C5.5 8.41 8.41 5.5 12 5.5C14.6 5.5 16.85 7.03 17.9 9.25M18.5 12C18.5 15.59 15.59 18.5 12 18.5C9.4 18.5 7.15 16.97 6.1 14.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
