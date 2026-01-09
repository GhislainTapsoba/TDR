'use client';

import { useState, useEffect } from 'react';
import { tasksApi, projectsApi, usersApi, stagesApi, Project, User, Stage } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, FileText, Calendar, Flag, User as UserIcon, FolderKanban, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { canCreateTask, mapRole, hasPermission } from '@/lib/permissions';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultProjectId?: string;
}

export default function TaskCreateModal({ isOpen, onClose, onSuccess, defaultProjectId }: TaskCreateModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    due_date: '',
    project_id: defaultProjectId || '',
    stage_id: '',
    assigned_to_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      if (user && hasPermission(mapRole(user.role), 'users', 'read')) {
        loadUsers();
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (defaultProjectId) {
      setFormData(prev => ({ ...prev, project_id: defaultProjectId }));
      loadStages(defaultProjectId);
    }
  }, [defaultProjectId]);

  useEffect(() => {
    if (formData.project_id) {
      loadStages(formData.project_id);
    } else {
      setStages([]);
      setFormData(prev => ({ ...prev, stage_id: '' }));
    }
  }, [formData.project_id]);

  const loadProjects = async () => {
    try {
      const { data } = await projectsApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const loadStages = async (projectId: string) => {
    try {
      const { data } = await stagesApi.getAll({ project_id: projectId });
      setStages(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading stages:', error);
      setStages([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !canCreateTask(mapRole(user.role))) {
      toast.error("Vous n'avez pas la permission de créer une tâche.");
      return;
    }

    if (!formData.project_id) {
      toast.error('Veuillez sélectionner un projet');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Création de la tâche en cours...');

    try {
      await tasksApi.create({
        title: formData.title,
        description: formData.description || null,
        status: formData.status as any,
        priority: formData.priority as any,
        due_date: formData.due_date || null,
        project_id: formData.project_id,
        stage_id: formData.stage_id || null,
        assigned_to_id: formData.assigned_to_id || null,
      });

      toast.success('Tâche créée avec succès !', { id: toastId });
      setFormData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: '',
        project_id: defaultProjectId || '',
        stage_id: '',
        assigned_to_id: '',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating task:', error);
      const message = error.response?.data?.error || 'Erreur lors de la création de la tâche';
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
          <h2 className="text-2xl font-bold text-gray-900">Nouvelle Tâche</h2>
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
              Titre de la tâche *
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

          {/* Projet */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FolderKanban size={18} />
              Projet *
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="">Sélectionner un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          {/* Étape (optionnel) */}
          {stages.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Layers size={18} />
                Étape (optionnel)
              </label>
              <select
                value={formData.stage_id}
                onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Aucune étape</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Liez cette tâche à une étape spécifique du projet (facultatif)
              </p>
            </div>
          )}

          {/* Statut et Priorité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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

          {/* Assigné à */}
          {user && hasPermission(mapRole(user.role), 'users', 'read') && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <UserIcon size={18} />
                Assigner à
              </label>
              <select
                value={formData.assigned_to_id}
                onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Non assignée</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {loading ? 'Création...' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
