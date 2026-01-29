'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function RedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectTo = searchParams.get('to');
    const isConfirmed = searchParams.get('confirmed') === 'true';
    const isRejectTask = searchParams.get('reject_task') === 'true';
    const taskId = searchParams.get('taskId');
    const message = searchParams.get('message');

    if (isConfirmed) {
      // This is an email confirmation redirect. First, sign out the user.
      signOut({ redirect: false }).then(() => {
        // After signOut is complete, redirect to the login page with the message.
        const loginUrl = `/login${message ? `?message=${encodeURIComponent(message)}` : ''}`;
        router.push(loginUrl);
      });

    } else if (isRejectTask && taskId) {
      // This is a task rejection redirect. First, sign out the user.
      signOut({ redirect: false }).then(() => {
        // After signOut is complete, redirect to the login page with task rejection info.
        const loginUrl = `/login?reject_task=true&taskId=${taskId}${message ? `&message=${encodeURIComponent(message)}` : ''}`;
        router.push(loginUrl);
      });

    } else if (searchParams.get('verify_task') === 'true' && taskId) {
      // This is a task verification redirect. First, sign out the user.
      signOut({ redirect: false }).then(() => {
        // After signOut is complete, redirect to the login page with task verification info.
        const loginUrl = `/login?verify_task=true&taskId=${taskId}${message ? `&message=${encodeURIComponent(message)}` : ''}`;
        router.push(loginUrl);
      });
      
    } else if (redirectTo) {
      // This is a generic redirect for other purposes.
      const decodedRedirectTo = decodeURIComponent(redirectTo);
      router.push(decodedRedirectTo);

    } else {
      // Fallback to the dashboard if no specific instruction is provided.
      router.push('/dashboard');
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-700">Processing...</p>
        <p className="text-sm text-gray-500">Please wait a moment.</p>
      </div>
    </div>
  );
}
