'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectTo = searchParams.get('to');
    
    // Decode the redirectTo parameter if it's encoded
    const decodedRedirectTo = redirectTo ? decodeURIComponent(redirectTo) : null;

    if (decodedRedirectTo) {
      router.push(decodedRedirectTo);
    } else {
      // Fallback if 'to' parameter is missing
      router.push('/dashboard');
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-700">Redirecting...</p>
        <p className="text-sm text-gray-500">Please wait a moment.</p>
      </div>
    </div>
  );
}
