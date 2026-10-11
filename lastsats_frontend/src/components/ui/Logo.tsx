import Image from 'next/image';

type LogoVariant = 'mark' | 'lockup';
type LogoTheme = 'dark' | 'light';

interface LogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  height?: number;
  priority?: boolean;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const SOURCES: Record<LogoVariant, Record<LogoTheme, string>> = {
  mark: {
    dark: '/brand/logo-mark-dark.png',
    light: '/brand/logo-mark-light.png',
  },
  lockup: {
    dark: '/brand/logo-lockup-dark.png',
    light: '/brand/logo-lockup-light.png',
  },
};

const ASPECT: Record<LogoVariant, number> = {
  mark: 209 / 239,
  lockup: 473 / 149,
};

export default function Logo({
  variant = 'lockup',
  theme = 'dark',
  height = 30,
  priority = false,
  alt = 'LastSats',
  className,
  style,
}: LogoProps) {
  const width = Math.round(height * ASPECT[variant]);

  return (
    <Image
      src={SOURCES[variant][theme]}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ display: 'block', height, width: 'auto', ...style }}
    />
  );
}
