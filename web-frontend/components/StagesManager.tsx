'use client';

import { useState, useEffect } from 'react';
import { Stage, stagesApi, usersApi, User } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  PlayCircle,
  XCircle,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, mapRole } from '@/lib/permissions';

interface StagesManagerProps {
  projectId: string;
  onStageComplete?: () => void;
}

export default function StagesManager({ projectId, onStageComplete }: StagesManagerProps) {
  const { user } = useAuth(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    order: ''
  });
  const [tasksToCreate, setTasksToCreate] = useState<Array<{
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    assigned_to_id: string;
  }>>([]);

  // Vérifier les permissions de l'utilisateur
  const canCreate = user ? hasPermission(mapRole(user.role), 'stages', 'create') : false;
  const canUpdate = user ? hasPermission(mapRole(user.role), 'stages', 'update') : false;
  const canDelete = user ? hasPermission(mapRole(user.role), 'stages', 'delete') : false;

  useEffect(() => {
    loadStages();
  }, [projectId]);

  const loadStages = async () => {
    try {
      const { data } = await stagesApi.getAll({ project_id: projectId });
      setStages(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      console.error('Error loading stages:', err);
      toast.error('Erreur lors du chargement des étapes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await stagesApi.create({
        name: formData.name,
        description: formData.description || null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        order: formData.order ? parseInt(formData.order) : stages.length + 1,
        project_id: projectId,
        status: 'PENDING'
      });

      setStages([...stages, data].sort((a, b) => a.order - b.order));
      toast.success('Étape créée avec succès');
      setIsAddModalOpen(false);
      setFormData({ name: '', description: '', duration: '', order: '' });
    } catch (error: any) {
      console.error('Error creating stage:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleEditStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage) return;

    try {
      const { data } = await stagesApi.update(selectedStage.id.toString(), {
        name: formData.name,
        description: formData.description || null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        order: formData.order ? parseInt(formData.order) : selectedStage.order
      });

      setStages(stages.map(s => s.id === data.id ? data : s).sort((a, b) => a.order - b.order));
      toast.success('Étape mise à jour avec succès');
      setIsEditModalOpen(false);
      setSelectedStage(null);
      setFormData({ name: '', description: '', duration: '', order: '' });
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette étape ?')) return;

    try {
      await stagesApi.delete(stageId.toString());
      setStages(stages.filter(s => s.id !== stageId));
      toast.success('Étape supprimée avec succès');
    } catch (error: any) {
      console.error('Error deleting stage:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleCompleteStage = async () => {
    if (!selectedStage) return;

    try {
      await stagesApi.complete(selectedStage.id.toString(), tasksToCreate);
      toast.success('Étape validée avec succès');
      setIsCompleteModalOpen(false);
      setSelectedStage(null);
      setTasksToCreate([]);
      loadStages();
      onStageComplete?.();
    } catch (error: any) {
      console.error('Error completing stage:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la validation');
    }
  };

  const openEditModal = (stage: Stage) => {
    setSelectedStage(stage);
    setFormData({
      name: stage.name,
      description: stage.description || '',
      duration: stage.duration?.toString() || '',
      order: stage.order.toString()
    });
    setIsEditModalOpen(true);
  };

  const openCompleteModal = async (stage: Stage) => {
    setSelectedStage(stage);
    setTasksToCreate([
      { title: '', description: '', priority: 'MEDIUM', assigned_to_id: '' }
    ]);
    // Load users for the dropdown
    try {
      const { data } = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setIsCompleteModalOpen(true);
  };

  const addTaskField = () => {
    setTasksToCreate([
      ...tasksToCreate,
      { title: '', description: '', priority: 'MEDIUM', assigned_to_id: '' }
    ]);
  };

  const removeTaskField = (index: number) => {
    setTasksToCreate(tasksToCreate.filter((_, i) => i !== index));
  };

  const updateTaskField = (index: number, field: string, value: string) => {
    const updated = [...tasksToCreate];
    updated[index] = { ...updated[index], [field]: value };
    setTasksToCreate(updated);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'IN_PROGRESS':
        return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'BLOCKED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'BLOCKED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminée';
      case 'BLOCKED':
        return 'Bloquée';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement des étapes...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Étapes du projet</h2>
          <p className="text-sm text-gray-600 mt-1">
            {canCreate ? 'Gérez les différentes phases de votre projet' : 'Consultez les différentes phases du projet'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            Nouvelle étape
          </button>
        )}
      </div>

      {/* Stages List */}
      {stages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">Aucune étape</p>
          <p className="text-gray-500 text-sm mb-4">
            {canCreate ? 'Créez votre première étape pour structurer votre projet' : 'Aucune étape n\'a encore été créée pour ce projet'}
          </p>
          {canCreate && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={20} />
              Créer une étape
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Order Badge */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {stage.order}
                    </div>
                    {index < stages.length - 1 && (
                      <ChevronRight className="w-5 h-5 text-gray-300 mt-2 rotate-90" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{stage.name}</h3>
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(stage.status)}`}>
                        {getStatusIcon(stage.status)}
                        {getStatusLabel(stage.status)}
                      </span>
                    </div>

                    {stage.description && (
                      <p className="text-gray-600 mb-3">{stage.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      {stage.duration && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{stage.duration} jours</span>
                        </div>
                      )}
                      <div className="text-gray-500">
                        Créée le {new Date(stage.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {(canUpdate || canDelete) && (
                  <div className="flex items-center gap-2 ml-4">
                    {canUpdate && stage.status !== 'COMPLETED' && (
                      <button
                        onClick={() => openCompleteModal(stage)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Valider l'étape"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        onClick={() => openEditModal(stage)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit size={20} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Stage Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Nouvelle étape</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleAddStage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'étape *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Ex: Phase de conception"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Décrivez cette étape..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordre
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    placeholder={`${stages.length + 1}`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Créer l'étape
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {isEditModalOpen && selectedStage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Modifier l'étape</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleEditStage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'étape *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordre
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Stage Modal */}
      {isCompleteModalOpen && selectedStage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Valider l'étape</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedStage.name}</p>
              </div>
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Vous pouvez créer automatiquement des tâches pour la prochaine étape.
                  Laissez vide si vous ne souhaitez pas créer de tâches maintenant.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Tâches à créer</h3>
                  <button
                    type="button"
                    onClick={addTaskField}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Ajouter une tâche
                  </button>
                </div>

                <div className="space-y-4">
                  {tasksToCreate.map((task, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Tâche {index + 1}</h4>
                        {tasksToCreate.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTaskField(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTaskField(index, 'title', e.target.value)}
                        placeholder="Titre de la tâche"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm"
                      />

                      <textarea
                        value={task.description}
                        onChange={(e) => updateTaskField(index, 'description', e.target.value)}
                        placeholder="Description (optionnelle)"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={task.priority}
                          onChange={(e) => updateTaskField(index, 'priority', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm"
                        >
                          <option value="LOW">Basse</option>
                          <option value="MEDIUM">Moyenne</option>
                          <option value="HIGH">Élevée</option>
                          <option value="URGENT">Urgente</option>
                        </select>

                        <select
                          value={task.assigned_to_id}
                          onChange={(e) => updateTaskField(index, 'assigned_to_id', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm"
                        >
                          <option value="">Non assignée</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCompleteStage}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Valider l'étape
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
