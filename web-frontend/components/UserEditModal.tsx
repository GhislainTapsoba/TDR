'use client';

import { useState, useEffect } from 'react';
import { usersApi, User } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, User as UserIcon, Mail, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { canManageUsers, mapRole } from '@/lib/permissions';

interface UserEditModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserEditModal({ user: userToEdit, isOpen, onClose, onSuccess }: UserEditModalProps) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: userToEdit.name,
    email: userToEdit.email,
    password: '',
    role: userToEdit.role,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mettre à jour le formulaire quand l'utilisateur change
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
    });
  }, [userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !canManageUsers(mapRole(currentUser.role))) {
      toast.error("Vous n'avez pas la permission de modifier un utilisateur.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Modification de l'utilisateur en cours...");

    try {
      // Le backend attend 'manager', 'admin', 'user' mais stocke 'PROJECT_MANAGER', 'ADMIN', 'EMPLOYEE'
      const roleMapping: Record<string, string> = {
        'ADMIN': 'admin',
        'PROJECT_MANAGER': 'manager',
        'EMPLOYEE': 'user',
      };

      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: roleMapping[formData.role] || 'user',
      };

      // N'envoyer le mot de passe que s'il a été modifié
      if (formData.password) {
        updateData.password = formData.password;
      }

      await usersApi.update(userToEdit.id, updateData);

      toast.success('Utilisateur modifié avec succès !', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      const message = error.response?.data?.error || "Erreur lors de la modification de l'utilisateur";
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserIcon className="text-green-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Modifier l'Utilisateur</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nom */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <UserIcon size={18} />
              Nom complet *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Ex: Jean Dupont"
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail size={18} />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900"
              placeholder="jean.dupont@example.com"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Lock size={18} />
              Nouveau mot de passe (optionnel)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Laissez vide pour ne pas changer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez ce champ vide si vous ne souhaitez pas modifier le mot de passe
            </p>
          </div>

          {/* Rôle */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Shield size={18} />
              Rôle *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="EMPLOYEE">Employé</option>
              <option value="PROJECT_MANAGER">Chef de Projet</option>
              <option value="ADMIN">Administrateur</option>
            </select>
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <p>• <strong>Employé</strong> : Accès de base, peut gérer ses tâches</p>
              <p>• <strong>Chef de Projet</strong> : Peut gérer des projets et des équipes</p>
              <p>• <strong>Administrateur</strong> : Accès complet à toutes les fonctionnalités</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Note :</strong> La modification du rôle affectera les permissions de l'utilisateur.
            </p>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Modification...' : "Modifier l'utilisateur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
