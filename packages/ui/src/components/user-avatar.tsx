'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar';

export function UserAvatar({ user, className = '' }: any) {
  const payload = user?.payload ? (typeof user.payload === 'string' ? JSON.parse(user.payload) : user.payload) : {};
  const avatar_url = payload?.photo_url;

  const initials = (user?.name || '')
    .split(' ')
    .map((word: string) => word.charAt(0))
    .join('');

  return (
    <Avatar className={className}>
      {avatar_url && <AvatarImage src={avatar_url} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

export default UserAvatar;
