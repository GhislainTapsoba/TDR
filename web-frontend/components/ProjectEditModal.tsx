'use client';

import { useState, useEffect } from 'react';
import { projectsApi, usersApi, Project, User } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, FolderKanban, FileText, Calendar, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, mapRole } from '@/lib/permissions';

interface ProjectEditModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProjectEditModal({ project, isOpen, onClose, onSuccess }: ProjectEditModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description || '',
    status: project.status,
    start_date: project.start_date?.split('T')[0] || '',
    end_date: project.end_date?.split('T')[0] || '',
    due_date: project.due_date?.split('T')[0] || '',
    manager_id: project.manager_id || '',
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Mettre à jour le formulaire quand le projet change
    setFormData({
      title: project.title,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date?.split('T')[0] || '',
      end_date: project.end_date?.split('T')[0] || '',
      due_date: project.due_date?.split('T')[0] || '',
      manager_id: project.manager_id || '',
    });
  }, [project]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const { data } = await usersApi.getAll({ role: 'PROJECT_MANAGER' });
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !hasPermission(mapRole(user.role), 'projects', 'update')) {
      toast.error("Vous n'avez pas la permission de modifier ce projet.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Modification du projet en cours...');

    try {
      await projectsApi.update(project.id, {
        title: formData.title,
        description: formData.description || null,
        status: formData.status as any,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        due_date: formData.due_date || null,
        manager_id: formData.manager_id || null,
      });

      toast.success('Projet modifié avec succès !', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating project:', error);
      const message = error.response?.data?.error || 'Erreur lors de la modification du projet';
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderKanban className="text-blue-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Modifier le Projet</h2>
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
          {/* Titre */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText size={18} />
              Titre du projet *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Ex: Développement d'une plateforme web"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText size={18} />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Décrivez le projet en détail..."
            />
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="PLANNING">Planification</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="ON_HOLD">En attente</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={18} />
                Date de début
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={18} />
                Date de fin
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={18} />
                Échéance
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Manager */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <UserIcon size={18} />
              Chef de Projet
            </label>
            <select
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="">Sélectionner un chef de projet</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Note :</strong> La modification du projet affectera toutes les étapes et tâches associées.
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
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Modification...' : 'Modifier le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
