interface AirplaneIconProps {
  color?: string;
  size?: number;
  heading?: number;
  className?: string;
}

/**
 * Airplane icon component that can be rotated based on heading
 */
export function AirplaneIcon({ 
  color = '#3b82f6', 
  size = 20, 
  heading = 0,
  className = ''
}: AirplaneIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        transform: `rotate(${heading}deg)`,
        transformOrigin: 'center',
        transition: 'transform 0.2s ease-out',
      }}
    >
      <path
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill={color}
        stroke="white"
        strokeWidth="0.5"
      />
    </svg>
  );
}
