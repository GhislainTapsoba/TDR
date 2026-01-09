'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { canAccessRoute } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Vérifier l'accès à la route
    const hasAccess = canAccessRoute(user.role, pathname);

    if (!hasAccess) {
      // Rediriger vers une page d'accès refusé ou dashboard
      router.push('/dashboard');
    }

    // Si un rôle spécifique est requis, le vérifier
    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, requiredRole, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Vérifier l'accès
  const hasAccess = canAccessRoute(user.role, pathname);
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
