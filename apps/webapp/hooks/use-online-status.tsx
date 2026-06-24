'use client';

import { useEffect, useState } from 'react';

const useOnlineStatus = (): boolean => {
  const [is_online, set_is_online] = useState(true);

  useEffect(() => {
    set_is_online(navigator.onLine);

    const handle_online = () => set_is_online(true);
    const handle_offline = () => set_is_online(false);

    window.addEventListener('online', handle_online);
    window.addEventListener('offline', handle_offline);

    return () => {
      window.removeEventListener('online', handle_online);
      window.removeEventListener('offline', handle_offline);
    };
  }, []);

  return is_online;
};

export { useOnlineStatus };
