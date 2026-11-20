import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { User } from '../types';

const PALETTE = [
  ['#e17076', '#c95d63'],
  ['#7bc862', '#5ca946'],
  ['#65aadd', '#4a8ec2'],
  ['#a695e7', '#8774d1'],
  ['#ee7aae', '#d65e93'],
  ['#faa774', '#e08c58'],
  ['#6ec9cb', '#4fadaf'],
];

interface AvatarProps {
  user: User;
  size?: number;
  showOnline?: boolean;
  className?: string;
}

export function Avatar({ user, size = 54, showOnline = false, className = '' }: AvatarProps) {
  const [from, to] = PALETTE[Math.abs(user.id) % PALETTE.length];
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: user.avatar ? undefined : `linear-gradient(140deg, ${from}, ${to})`,
  };

  return (
    <div className={`avatar ${className}`.trim()} style={style} title={user.name}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} draggable={false} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.37) }}>{initials || user.username[0]?.toUpperCase()}</span>
      )}
      {showOnline && <span className={`online-dot ${user.online ? 'is-online' : ''}`} />}
    </div>
  );
}

export function TelegramLogo({ size = 96, plain = false }: { size?: number; plain?: boolean }) {
  const rawId = useId();
  const id = `logo-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#37aee2" />
          <stop offset="1" stopColor="#1e96c8" />
        </linearGradient>
      </defs>
      {!plain && <circle cx="32" cy="32" r="32" fill={`url(#${id})`} />}
      <path
        fill={plain ? 'var(--accent)' : '#ffffff'}
        transform={plain ? 'translate(0 0)' : undefined}
        d="M14 31.5l32.6-12.6c1.5-.6 2.8.4 2.3 2.7l-5.6 26.3c-.4 1.9-1.5 2.4-3.1 1.5L30.2 42l-5.1 4.9c-.6.6-1 .9-1.8.9l.6-7.4 18-16.3c.8-.7-.2-1.1-1.2-.4L18.5 37.4 14 36c-1.6-.5-1.6-1.5 0-2.1z"
      />
    </svg>
  );
}
