import Image from 'next/image';

type LogoVariant = 'mark' | 'lockup';
type LogoTheme = 'dark' | 'light' | 'auto';

interface LogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  height?: number;
  priority?: boolean;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const SOURCES: Record<LogoVariant, Record<'dark' | 'light', string>> = {
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
  theme = 'auto',
  height = 30,
  priority = false,
  alt = 'LastSats',
  className,
  style,
}: LogoProps) {
  const width = Math.round(height * ASPECT[variant]);
  const imgStyle: React.CSSProperties = { display: 'block', height, width: 'auto' };

  if (theme !== 'auto') {
    return (
      <Image
        src={SOURCES[variant][theme]}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className}
        style={{ ...imgStyle, ...style }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
    >
      <Image
        className="logo-theme-dark"
        src={SOURCES[variant].dark}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        style={imgStyle}
      />
      <Image
        className="logo-theme-light"
        src={SOURCES[variant].light}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        style={imgStyle}
      />
    </span>
  );
}
