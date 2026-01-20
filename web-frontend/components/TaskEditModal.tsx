"use client"

import { useState, useEffect } from 'react';
import { Task, tasksApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Calendar, Flag, User, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context'; // Updated import path for useAuth
import { hasPermission } from '@/lib/permissions'; // Explicitly import hasPermission from lib

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Changed (updatedTask: Task) => void to () => void
}

export default function TaskEditModal({ task, isOpen, onClose, onSave }: TaskEditModalProps) {
  const { user: authUser } = useAuth(); // Use authUser to avoid conflict with imported User type
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);

  // Corrected permission check
  const canDelete = hasPermission(authUser?.permissions || [], 'tasks.delete');

  useEffect(() => {
    // Mettre à jour le formulaire quand la tâche change
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
  }, [task]);

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Vous n'avez pas la permission de supprimer une tâche.");
      return;
    }

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.')) {
      setLoading(true);
      const toastId = toast.loading('Suppression de la tâche en cours...');
      try {
        await tasksApi.delete(task.id);
        toast.success('Tâche supprimée avec succès !', { id: toastId });
        onSave(); // To trigger a refresh
        onClose();
      } catch (error: any) {
        const message = error.response?.data?.error || 'Erreur lors de la suppression de la tâche';
        toast.error(message, { id: toastId });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Corrected permission check
    const canUpdate = hasPermission(authUser?.permissions || [], 'tasks.update');
    
    if (!authUser || !canUpdate) {
      toast.error("Vous n'avez pas la permission de modifier une tâche.");
      return;
    }

    // Un utilisateur ne peut modifier que ses propres tâches
    if (authUser?.role === 'employe' && !task.assignees?.includes(authUser?.id)) {
      toast.error("Vous ne pouvez modifier que les tâches qui vous sont assignées.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Mise à jour de la tâche en cours...');

    try {
      // task.id is type number, but tasksApi.update expects string. Assuming API expects string.
      await tasksApi.update(task.id.toString(), {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
      });

      toast.success('Tâche mise à jour avec succès !', { id: toastId });
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating task:', error);
      const message = error.response?.data?.error || 'Erreur lors de la mise à jour de la tâche';
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
          <h2 className="text-2xl font-bold text-gray-900">Modifier la tâche</h2>
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
              Titre de la tâche
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Ex: Développer la fonctionnalité X"
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
              placeholder="Décrivez la tâche en détail..."
            />
          </div>

          {/* Statut et Priorité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="TODO">À faire</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="IN_REVIEW">En révision</option>
                <option value="COMPLETED">Terminée</option>
                <option value="CANCELLED">Annulée</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Flag size={18} />
                Priorité
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Élevée</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          {/* Date d'échéance */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar size={18} />
              Date d'échéance
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            {canDelete && (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 px-6 py-3 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Suppression...' : 'Supprimer'}
                </button>
            )}
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
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
