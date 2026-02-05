'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditUserRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const userId = params.id as string;
    // Rediriger vers la page de profil de l'utilisateur avec un paramètre pour ouvrir le modal d'édition
    router.replace(`/users/${userId}?modal=edit`);
  }, [router, params]);

  return null; // Cette page ne rend rien, elle redirige seulement
}
