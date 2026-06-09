import React from 'react'

/** Hand-drawn line doodles (Pinterest-style sketch icons) */

function DoodleSvg({ size = 24, className = '', children, viewBox = '0 0 48 48' }) {
  return (
    <svg
      className={`doodle ${className}`.trim()}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const sketch = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function DoodleWave({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <path {...sketch} d="M8 28c3-8 8-12 14-12s11 4 14 12" />
      <path {...sketch} d="M10 20c2-3 5-5 8-5s7 2 9 5" />
      <path {...sketch} d="M12 34h20" />
      <circle cx="34" cy="14" r="2" fill="currentColor" stroke="none" />
      <circle cx="38" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </DoodleSvg>
  )
}

export function DoodleDatabase({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <ellipse {...sketch} cx="24" cy="14" rx="14" ry="5" />
      <path {...sketch} d="M10 14v14c0 3 6 5 14 5s14-2 14-5V14" />
      <path {...sketch} d="M10 22c0 3 6 5 14 5s14-2 14-5" />
    </DoodleSvg>
  )
}

export function DoodleDocument({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <path {...sketch} d="M14 8h14l8 8v24a3 3 0 01-3 3H14a3 3 0 01-3-3V11a3 3 0 013-3z" />
      <path {...sketch} d="M28 8v8h8" />
      <path {...sketch} d="M16 26h16M16 32h12" />
    </DoodleSvg>
  )
}

export function DoodleClipboard({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <rect {...sketch} x="14" y="12" width="20" height="28" rx="3" />
      <path {...sketch} d="M18 12V9a6 6 0 0112 0v3" />
      <path {...sketch} d="M18 22h12M18 28h8" />
    </DoodleSvg>
  )
}

export function DoodleBrush({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <path {...sketch} d="M10 34l16-16 6 6-16 16H10v-6z" />
      <path {...sketch} d="M30 14l4-4 4 4-4 4z" />
      <path {...sketch} d="M12 38h8" />
    </DoodleSvg>
  )
}

export function DoodleFlower({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <circle {...sketch} cx="24" cy="20" r="5" />
      <path {...sketch} d="M24 8v4M24 28v4M12 20h4M32 20h4M15 11l3 3M33 29l3 3M33 11l-3 3M15 29l-3 3" />
      <path {...sketch} d="M24 32c-2 4-6 6-8 8" />
    </DoodleSvg>
  )
}

export function DoodleWarning({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <path {...sketch} d="M24 8L6 40h36L24 8z" />
      <path {...sketch} d="M24 18v12" />
      <circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" />
    </DoodleSvg>
  )
}

export function DoodleUpload({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <path {...sketch} d="M24 10v20M16 18l8-8 8 8" />
      <path {...sketch} d="M10 34h28" />
      <path {...sketch} d="M14 38h20" />
    </DoodleSvg>
  )
}

export function DoodleChart({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <path {...sketch} d="M10 38V14M10 38h30" />
      <path {...sketch} d="M16 32l6-10 6 6 10-16" />
    </DoodleSvg>
  )
}

export function DoodleSparkle({ size, className }) {
  return (
    <DoodleSvg size={size} className={className}>
      <path {...sketch} d="M24 8l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8z" />
      <path {...sketch} d="M36 28l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z" />
    </DoodleSvg>
  )
}

const MAP = {
  wave: DoodleWave,
  database: DoodleDatabase,
  document: DoodleDocument,
  clipboard: DoodleClipboard,
  brush: DoodleBrush,
  flower: DoodleFlower,
  warning: DoodleWarning,
  upload: DoodleUpload,
  chart: DoodleChart,
  sparkle: DoodleSparkle,
}

export default function Doodle({ name, size = 22, className = '' }) {
  const Component = MAP[name]
  if (!Component) return null
  return <Component size={size} className={className} />
}
