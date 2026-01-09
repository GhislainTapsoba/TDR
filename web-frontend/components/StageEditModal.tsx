'use client';

import { useState, useEffect } from 'react';
import { stagesApi, projectsApi, Stage, Project } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Layers, FileText, Hash, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, mapRole } from '@/lib/permissions';

interface StageEditModalProps {
  stage: Stage;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StageEditModal({ stage, isOpen, onClose, onSuccess }: StageEditModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: stage.name,
    description: stage.description || '',
    order: stage.order,
    duration: stage.duration?.toString() || '',
    status: stage.status,
    project_id: stage.project_id.toString(),
  });
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Mettre à jour le formulaire quand l'étape change
    setFormData({
      name: stage.name,
      description: stage.description || '',
      order: stage.order,
      duration: stage.duration?.toString() || '',
      status: stage.status,
      project_id: stage.project_id.toString(),
    });
  }, [stage]);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      const { data } = await projectsApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !hasPermission(mapRole(user.role), 'stages', 'update')) {
      toast.error("Vous n'avez pas la permission de modifier cette étape.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Modification de l'étape en cours...");

    try {
      await stagesApi.update(stage.id.toString(), {
        name: formData.name,
        description: formData.description || null,
        order: formData.order,
        duration: formData.duration ? parseInt(formData.duration) : null,
        status: formData.status,
        project_id: formData.project_id,
      });

      toast.success('Étape modifiée avec succès !', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating stage:', error);
      const message = error.response?.data?.error || "Erreur lors de la modification de l'étape";
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <Layers className="text-purple-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Modifier l'Étape</h2>
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
          {/* Projet */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText size={18} />
              Projet *
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="">Sélectionner un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          {/* Nom */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Layers size={18} />
              Nom de l'étape *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Ex: Conception, Développement, Tests..."
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Décrivez cette étape en détail..."
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="PENDING">En attente</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="COMPLETED">Terminée</option>
              <option value="BLOCKED">Bloquée</option>
            </select>
          </div>

          {/* Ordre et Durée */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Hash size={18} />
                Ordre
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Position dans la séquence (0, 1, 2...)</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock size={18} />
                Durée (jours)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Ex: 5, 10, 15..."
              />
              <p className="text-xs text-gray-500 mt-1">Durée estimée en jours</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Note :</strong> Modifier l'ordre ou le projet peut affecter les tâches associées à cette étape.
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
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Modification...' : "Modifier l'étape"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
