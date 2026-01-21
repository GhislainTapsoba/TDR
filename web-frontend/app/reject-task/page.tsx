'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; // Assuming you have a useAuth hook for the token

function RejectTaskForm() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: authData } = useAuth(); // Get auth data, including the token

  useEffect(() => {
    if (!taskId) {
      setError('ID de la tâche manquant dans l\'URL.');
    }
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) {
      setError('Impossible de soumettre : ID de la tâche manquant.');
      return;
    }
    if (!reason.trim()) {
      setError('Veuillez fournir une raison pour le refus.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData?.token}`, // Use token from auth hook
        },
        body: JSON.stringify({ rejectionReason: reason }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue.');
      }

      setMessage('Votre refus a été soumis avec succès. Vous pouvez fermer cette page.');
      setReason(''); // Clear the textarea
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Refuser la Tâche</h1>
        <p className="text-center text-gray-600 mb-6">
          Tâche ID: <code className="bg-gray-200 text-gray-800 px-2 py-1 rounded">{taskId}</code>
        </p>

        {message ? (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md" role="alert">
            <p className="font-bold">Succès</p>
            <p>{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="reason" className="block text-gray-700 text-sm font-bold mb-2">
                Raison du refus (obligatoire)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32 resize-none"
                placeholder="Expliquez pourquoi vous ne pouvez pas réaliser cette tâche..."
                required
              />
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <p>{error}</p>
              </div>
            )}
            <div className="flex items-center justify-center">
              <button
                type="submit"
                disabled={loading}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Soumission...' : 'Soumettre le Refus'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


// Wrap the component in Suspense to handle the use of useSearchParams
export default function RejectTaskPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Chargement...</div>}>
      <RejectTaskForm />
    </Suspense>
  );
}
