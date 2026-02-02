'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

function TaskResponseForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const taskId = searchParams.get('taskId');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [existingResponse, setExistingResponse] = useState<string | null>(null);
  const [checkingResponse, setCheckingResponse] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (!taskId) {
      setError('ID de la tâche manquant dans l\'URL.');
      setCheckingResponse(false);
      return;
    }

    checkExistingResponse();
  }, [taskId, user, authLoading, router]);

  const checkExistingResponse = async () => {
    if (!taskId || !token) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/respond`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasResponded(data.has_responded);
        setExistingResponse(data.response);
        
        if (data.has_responded) {
          setMessage(`Vous avez déjà ${data.response === 'accepted' ? 'accepté' : 'refusé'} cette tâche.`);
        }
      }
    } catch (err) {
      console.error('Error checking response:', err);
    } finally {
      setCheckingResponse(false);
    }
  };

  const handleResponse = async (responseType: 'accepted' | 'rejected') => {
    if (!taskId || hasResponded) return;

    if (responseType === 'rejected' && !reason.trim()) {
      setError('Veuillez fournir une raison pour le refus.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${taskId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          response: responseType,
          reason: responseType === 'rejected' ? reason : undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setHasResponded(true);
          setExistingResponse(result.existing_response);
          setMessage(`Vous avez déjà ${result.existing_response === 'accepted' ? 'accepté' : 'refusé'} cette tâche.`);
          return;
        }
        throw new Error(result.error || 'Une erreur est survenue.');
      }

      setHasResponded(true);
      setExistingResponse(responseType);
      setMessage(
        responseType === 'accepted' 
          ? 'Tâche acceptée avec succès ! Elle a été démarrée automatiquement.'
          : 'Votre refus a été soumis avec succès.'
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingResponse) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) return null;

  if (error && !taskId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-8 bg-white shadow-md rounded-lg text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full mx-auto p-8 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
          Répondre à la Tâche
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Tâche ID: <code className="bg-gray-200 text-gray-800 px-2 py-1 rounded">{taskId}</code>
        </p>

        {message ? (
          <div className={`border-l-4 p-4 rounded-md ${
            existingResponse === 'accepted' 
              ? 'bg-green-100 border-green-500 text-green-700'
              : 'bg-blue-100 border-blue-500 text-blue-700'
          }`} role="alert">
            <p className="font-bold">
              {existingResponse === 'accepted' ? 'Tâche Acceptée' : 'Tâche Refusée'}
            </p>
            <p>{message}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleResponse('accepted')}
                disabled={loading || hasResponded}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Traitement...' : 'Accepter et Démarrer'}
              </button>
              
              <button
                onClick={() => handleResponse('rejected')}
                disabled={loading || hasResponded}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Traitement...' : 'Refuser'}
              </button>
            </div>

            <div className="border-t pt-4">
              <label htmlFor="reason" className="block text-gray-700 text-sm font-bold mb-2">
                Raison du refus (obligatoire si vous refusez)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24 resize-none"
                placeholder="Expliquez pourquoi vous ne pouvez pas réaliser cette tâche..."
                disabled={hasResponded}
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <p>{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskResponsePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Chargement...</div>}>
      <TaskResponseForm />
    </Suspense>
  );
}