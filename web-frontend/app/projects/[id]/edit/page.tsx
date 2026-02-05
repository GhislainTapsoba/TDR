'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditProjectRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const projectId = params.id as string;
    // Rediriger vers la page de détail du projet avec un paramètre pour ouvrir le modal d'édition
    router.replace(`/projects/${projectId}?modal=edit`);
  }, [router, params]);

  return null; // Cette page ne rend rien, elle redirige seulement
}
