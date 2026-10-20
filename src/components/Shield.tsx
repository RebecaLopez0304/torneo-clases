import { useId } from "react";
import { PLACEHOLDER_COLOR } from "@/lib/colors";

/** Escudo del equipo, con brillo del color del equipo (como en la propuesta). */
export function Shield({
  color = PLACEHOLDER_COLOR,
  size = 28,
  glow = false,
  className,
}: {
  color?: string;
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 40 46"
      width={size}
      height={size * 1.15}
      aria-hidden
      className={className}
      style={glow ? { filter: `drop-shadow(0 0 ${size / 6}px ${color}99)` } : undefined}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.38" />
          <stop offset="1" stopColor={color} stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5 36 8v13.2c0 10.4-6.7 18.3-16 22.3C10.7 39.5 4 31.6 4 21.2V8L20 2.5Z"
        fill={`url(#${id}-fill)`}
        stroke={color}
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M20 10.5 29 13.6v7.6c0 6-3.7 10.7-9 13.3-5.3-2.6-9-7.3-9-13.3v-7.6l9-3.1Z"
        fill="#0a1530"
        fillOpacity="0.55"
        stroke={color}
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
