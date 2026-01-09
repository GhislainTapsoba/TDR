'use client';

import { useState } from 'react';
import { usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, User, Mail, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { canManageUsers, mapRole } from '@/lib/permissions';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserCreateModal({ isOpen, onClose, onSuccess }: UserCreateModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !canManageUsers(mapRole(user.role))) {
      toast.error("Vous n'avez pas la permission de créer un utilisateur.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Création de l'utilisateur en cours...");

    try {
      // Le backend attend 'manager', 'admin', 'user' mais stocke 'PROJECT_MANAGER', 'ADMIN', 'EMPLOYEE'
      const roleMapping: Record<string, string> = {
        'ADMIN': 'admin',
        'PROJECT_MANAGER': 'manager',
        'EMPLOYEE': 'user',
      };

      await usersApi.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: roleMapping[formData.role] || 'user',
      });

      toast.success('Utilisateur créé avec succès !', { id: toastId });
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      const message = error.response?.data?.error || "Erreur lors de la création de l'utilisateur";
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
              <User className="text-green-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Nouvel Utilisateur</h2>
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
              <User size={18} />
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
              Mot de passe *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Minimum 6 caractères"
            />
            <p className="text-xs text-gray-500 mt-1">Le mot de passe doit contenir au moins 6 caractères</p>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              💡 <strong>Astuce :</strong> L'utilisateur recevra ses identifiants par email et pourra se connecter immédiatement.
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
              {loading ? 'Création...' : "Créer l'utilisateur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
