'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect } from 'react';

function SessionTokenHandler({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.customToken) {
      localStorage.setItem('token', session.customToken);
    }
  }, [session]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionTokenHandler>{children}</SessionTokenHandler>
    </SessionProvider>
  );
}
