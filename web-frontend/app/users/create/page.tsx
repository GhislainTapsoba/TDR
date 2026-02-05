'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateUserRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page des utilisateurs avec un paramètre pour ouvrir le modal
    router.replace('/users?modal=create');
  }, [router]);

  return null; // Cette page ne rend rien, elle redirige seulement
}
