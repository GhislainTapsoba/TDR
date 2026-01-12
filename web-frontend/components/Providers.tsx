'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect } from 'react';

function SessionTokenHandler({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    // @ts-ignore - The session object is augmented in the backend callbacks
    if (session?.customToken) {
      // @ts-ignore
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
