'use client';

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-red-600">403</h1>

        <h2 className="mt-4 text-2xl font-semibold text-gray-800">
          Accès refusé
        </h2>

        <p className="mt-2 text-gray-600">
          Vous n’avez pas les permissions nécessaires pour accéder à cette page.
        </p>

        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Tableau de bord
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Accueil
          </Link>

          <button
            onClick={() => window.history.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Retour
          </button>
        </div>
      </div>
    </main>
  );
}
