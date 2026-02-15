import { motion } from "framer-motion";

interface RobotAvatarProps {
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  name?: string;
  animated?: boolean;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getRobotVariant(name: string): number {
  return hashString(name || "robot") % 5;
}

function RobotFace({ variant, color }: { variant: number; color: string }) {
  switch (variant) {
    case 0:
      return (
        <g>
          <rect x="10" y="8" width="20" height="16" rx="4" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
          <circle cx="16" cy="16" r="2.5" fill="white" opacity="0.95" />
          <circle cx="24" cy="16" r="2.5" fill="white" opacity="0.95" />
          <rect x="14" y="21" width="12" height="1.5" rx="0.75" fill="white" opacity="0.7" />
          <line x1="20" y1="4" x2="20" y2="8" stroke="white" strokeWidth="1.5" opacity="0.6" />
          <circle cx="20" cy="3" r="1.5" fill="white" opacity="0.6" />
          <rect x="6" y="13" width="3" height="6" rx="1.5" fill="white" opacity="0.4" />
          <rect x="31" y="13" width="3" height="6" rx="1.5" fill="white" opacity="0.4" />
          <line x1="12" y1="28" x2="14" y2="32" stroke="white" strokeWidth="1.2" opacity="0.4" />
          <line x1="28" y1="28" x2="26" y2="32" stroke="white" strokeWidth="1.2" opacity="0.4" />
        </g>
      );
    case 1:
      return (
        <g>
          <path d="M12 10 L20 6 L28 10 L28 24 L20 28 L12 24 Z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
          <circle cx="17" cy="15" r="2" fill="white" opacity="0.95" />
          <circle cx="23" cy="15" r="2" fill="white" opacity="0.95" />
          <path d="M16 20 Q20 23 24 20" fill="none" stroke="white" strokeWidth="1.2" opacity="0.7" />
          <line x1="20" y1="6" x2="20" y2="2" stroke="white" strokeWidth="1.2" opacity="0.5" />
          <polygon points="18,1 20,0 22,1 20,2" fill="white" opacity="0.5" />
          <circle cx="10" cy="17" r="1.5" fill="white" opacity="0.3" />
          <circle cx="30" cy="17" r="1.5" fill="white" opacity="0.3" />
          <line x1="10" y1="17" x2="12" y2="17" stroke="white" strokeWidth="0.8" opacity="0.3" />
          <line x1="28" y1="17" x2="30" y2="17" stroke="white" strokeWidth="0.8" opacity="0.3" />
        </g>
      );
    case 2:
      return (
        <g>
          <circle cx="20" cy="16" r="11" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
          <circle cx="20" cy="16" r="8" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" />
          <ellipse cx="16" cy="14" rx="2.5" ry="3" fill="white" opacity="0.9" />
          <ellipse cx="24" cy="14" rx="2.5" ry="3" fill="white" opacity="0.9" />
          <circle cx="16" cy="14" r="1" fill={color} opacity="0.8" />
          <circle cx="24" cy="14" r="1" fill={color} opacity="0.8" />
          <path d="M16 21 Q20 24 24 21" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
          <line x1="20" y1="5" x2="20" y2="2" stroke="white" strokeWidth="1.2" opacity="0.5" />
          <line x1="16" y1="5.5" x2="14" y2="3" stroke="white" strokeWidth="0.8" opacity="0.4" />
          <line x1="24" y1="5.5" x2="26" y2="3" stroke="white" strokeWidth="0.8" opacity="0.4" />
        </g>
      );
    case 3:
      return (
        <g>
          <rect x="11" y="9" width="18" height="14" rx="2" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
          <rect x="13" y="11" width="5" height="4" rx="1" fill="white" opacity="0.9" />
          <rect x="22" y="11" width="5" height="4" rx="1" fill="white" opacity="0.9" />
          <rect x="15" y="19" width="10" height="2" rx="1" fill="white" opacity="0.6" />
          <line x1="15" y1="19" x2="15" y2="21" stroke="white" strokeWidth="0.8" opacity="0.4" />
          <line x1="18" y1="19" x2="18" y2="21" stroke="white" strokeWidth="0.8" opacity="0.4" />
          <line x1="21" y1="19" x2="21" y2="21" stroke="white" strokeWidth="0.8" opacity="0.4" />
          <line x1="24" y1="19" x2="24" y2="21" stroke="white" strokeWidth="0.8" opacity="0.4" />
          <rect x="17" y="4" width="6" height="5" rx="1" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
          <circle cx="20" cy="6.5" r="1" fill="white" opacity="0.5" />
          <rect x="8" y="12" width="3" height="8" rx="1.5" fill="white" opacity="0.3" />
          <rect x="29" y="12" width="3" height="8" rx="1.5" fill="white" opacity="0.3" />
          <line x1="14" y1="26" x2="14" y2="30" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <line x1="26" y1="26" x2="26" y2="30" stroke="white" strokeWidth="1.5" opacity="0.4" />
        </g>
      );
    case 4:
    default:
      return (
        <g>
          <path d="M14 8 Q20 4 26 8 L28 22 Q20 28 12 22 Z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
          <circle cx="17" cy="14" r="2.5" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
          <circle cx="23" cy="14" r="2.5" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
          <circle cx="17" cy="14" r="1" fill="white" opacity="0.95" />
          <circle cx="23" cy="14" r="1" fill="white" opacity="0.95" />
          <path d="M17 20 L20 22 L23 20" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
          <line x1="14" y1="8" x2="10" y2="5" stroke="white" strokeWidth="1" opacity="0.4" />
          <line x1="26" y1="8" x2="30" y2="5" stroke="white" strokeWidth="1" opacity="0.4" />
          <circle cx="10" cy="5" r="1.5" fill="white" opacity="0.4" />
          <circle cx="30" cy="5" r="1.5" fill="white" opacity="0.4" />
        </g>
      );
  }
}

const sizeMap = {
  sm: { container: "w-8 h-8", svg: 40 },
  md: { container: "w-10 h-10", svg: 40 },
  lg: { container: "w-12 h-12", svg: 40 },
  xl: { container: "w-16 h-16", svg: 40 },
};

export function RobotAvatar({ color, size = "md", name = "", animated = false }: RobotAvatarProps) {
  const variant = getRobotVariant(name);
  const s = sizeMap[size];

  const gradientId = `robot-grad-${name}-${variant}`;
  const glowId = `robot-glow-${name}-${variant}`;

  const inner = (
    <div
      className={`${s.container} rounded-full flex items-center justify-center shrink-0 relative overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${color}, hsl(280 60% 65%))`,
        boxShadow: `0 0 20px ${color}33, inset 0 1px 1px rgba(255,255,255,0.2)`,
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
        }}
      />
      <svg
        viewBox="0 0 40 34"
        className={`${size === "sm" ? "w-5 h-5" : size === "md" ? "w-6 h-6" : size === "lg" ? "w-7 h-7" : "w-9 h-9"} relative z-10`}
        fill="none"
      >
        <RobotFace variant={variant} color={color} />
      </svg>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="relative"
      >
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            transform: "scale(1.4)",
          }}
        />
        {inner}
      </motion.div>
    );
  }

  return inner;
}

export function PlusAvatar({ size = "lg" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const s = sizeMap[size];
  return (
    <div
      className={`${s.container} rounded-full flex items-center justify-center shrink-0 relative overflow-hidden`}
      style={{
        background: "linear-gradient(135deg, hsl(340 80% 65%), hsl(280 60% 70%))",
        boxShadow: "0 0 20px rgba(232,121,160,0.2), inset 0 1px 1px rgba(255,255,255,0.2)",
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
        }}
      />
      <svg
        viewBox="0 0 24 24"
        className={`${size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-6 h-6"} relative z-10`}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
  );
}
