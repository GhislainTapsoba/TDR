'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Une erreur est survenue</h1>
        <p className="text-gray-400 mb-8">Quelque chose s'est mal passé</p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors mr-4"
        >
          Réessayer
        </button>
        <a 
          href="/dashboard" 
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Retour au tableau de bord
        </a>
      </div>
    </div>
  )
}