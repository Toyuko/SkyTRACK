import { ATCStation } from '../services/atcDataService';

interface ATCIconProps {
  facility: string;
  size?: number;
  color?: string;
}

export function ATCIcon({ facility, size = 20, color = '#3b82f6' }: ATCIconProps) {
  // Map facility to icon shape
  const getIconShape = (facility: string): string => {
    const upper = facility.toUpperCase();
    if (upper === 'CTR' || upper === 'CENTER') {
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z';
    } else if (upper === 'APP' || upper === 'APPROACH') {
      return 'M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z';
    } else if (upper === 'TWR' || upper === 'TOWER') {
      return 'M12 2L2 22h20L12 2zm0 3.99L19.53 20H4.47L12 5.99z';
    } else if (upper === 'GND' || upper === 'GROUND') {
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
    } else if (upper === 'DEL' || upper === 'DELIVERY') {
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';
    } else {
      // Default circle
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z';
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.2" />
      <path
        d={getIconShape(facility)}
        fill={color}
        stroke="white"
        strokeWidth="0.5"
      />
    </svg>
  );
}
