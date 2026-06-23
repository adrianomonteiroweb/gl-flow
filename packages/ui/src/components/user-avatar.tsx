'use client';

import md5 from 'md5';
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar';

export function UserAvatar({ user, size = 38, className = '' }: any) {
  const aid = md5(user?.email ?? '');
  const gravatar_url = `https://www.gravatar.com/avatar/${aid}?d=mm&r=g&s=${size}`;

  // Check for photo_url in payload first, then fall back to gravatar
  const payload = user?.payload ? (typeof user.payload === 'string' ? JSON.parse(user.payload) : user.payload) : {};
  const photo_url = payload?.photo_url;
  const avatar_url = photo_url || gravatar_url;

  const initials = (user?.name || '')
    .split(' ')
    .map((word: string) => word.charAt(0))
    .join('');

  return (
    <Avatar className={className}>
      <AvatarImage src={avatar_url} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

export default UserAvatar;
