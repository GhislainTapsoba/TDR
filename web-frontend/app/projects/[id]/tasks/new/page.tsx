'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function NewTaskRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const projectId = params.id as string;
    // Rediriger vers la page de détail du projet avec un paramètre pour ouvrir le modal de création de tâche
    router.replace(`/projects/${projectId}?modal=create-task`);
  }, [router, params]);

  return null; // Cette page ne rend rien, elle redirige seulement
}
