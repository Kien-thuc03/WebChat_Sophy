import React from 'react';
import { useAvatarPlaceholder } from '../../features/auth/hooks/useAvatarPlaceholder';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  size = 40,
  className = '',
}) => {
  const { content, style } = useAvatarPlaceholder(name, avatarUrl);

  return (
    <div
      className={`avatar-container ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontSize: `${Math.floor(size * 0.4)}px`,
        fontWeight: 'bold',
        color: '#FFFFFF',
        ...style,
      }}
    >
      {content}
    </div>
  );
};