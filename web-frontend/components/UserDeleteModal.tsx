'use client';

import { useState } from 'react';
import { usersApi, User } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { canManageUsers } from '@/lib/permissions';

interface UserDeleteModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserDeleteModal({ user: userToDelete, isOpen, onClose, onSuccess }: UserDeleteModalProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error("Vous n'avez pas la permission de supprimer un utilisateur.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Suppression de l'utilisateur en cours...");

    try {
      await usersApi.delete(userToDelete.id.toString());
      toast.success('Utilisateur supprimé avec succès !', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || "Erreur lors de la suppression de l'utilisateur";
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Confirmer la suppression</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="text-red-600 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Êtes-vous sûr de vouloir supprimer cet utilisateur ?
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Cette action est irréversible. Toutes les données associées à cet utilisateur seront supprimées.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Utilisateur à supprimer :</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-700"><strong>Nom :</strong> {userToDelete.name}</p>
              <p className="text-sm text-gray-700"><strong>Email :</strong> {userToDelete.email}</p>
              <p className="text-sm text-gray-700"><strong>Rôle :</strong> {userToDelete.role}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}
