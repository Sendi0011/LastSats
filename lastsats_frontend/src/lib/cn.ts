/**
 * Lightweight className utility — joins truthy strings.
 * Drop-in for clsx without the dependency.
 *
 * Usage: cn('base', condition && 'extra', 'always')
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
