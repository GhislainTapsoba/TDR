"use client"

import { useState, useEffect } from 'react';
import { Task, tasksApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Calendar, Flag, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context'; // Updated import path for useAuth
import { hasPermission, mapRole } from '@/lib/permissions'; // Explicitly import hasPermission from lib
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskEditModalProps {
  task: any;
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
  const canDelete = hasPermission(mapRole(authUser?.role || ''), 'tasks.delete');

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
    const canUpdate = hasPermission(mapRole(authUser?.role || ''), 'tasks.update');
    const isEmployeeAssignee = authUser?.role === 'employe' && task.assignees?.some((a: any) => a.id === authUser?.id);

    console.log('TaskEditModal: authUser', authUser);
    console.log('TaskEditModal: canUpdate', canUpdate);
    console.log('TaskEditModal: isEmployeeAssignee', isEmployeeAssignee);
    console.log('TaskEditModal: formData', formData);

    if (!authUser || (!canUpdate && !isEmployeeAssignee)) {
      toast.error("Vous n'avez pas la permission de modifier une tâche.");
      return;
    }

    // Un utilisateur ne peut modifier que ses propres tâches
    if (authUser?.role?.toLowerCase() === 'employee' && !task.assignees?.some((a: any) => a.id === authUser?.id)) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titre */}
          <div>
            <Label className="flex items-center gap-2">
              <FileText size={18} />
              Titre de la tâche
            </Label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ex: Développer la fonctionnalité X"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="flex items-center gap-2">
              <FileText size={18} />
              Description
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Décrivez la tâche en détail..."
            />
          </div>

          {/* Statut et Priorité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Statut</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">À faire</SelectItem>
                  <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                  <SelectItem value="IN_REVIEW">En révision</SelectItem>
                  <SelectItem value="COMPLETED">Terminée</SelectItem>
                  <SelectItem value="CANCELLED">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Flag size={18} />
                Priorité
              </Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as any })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Basse</SelectItem>
                  <SelectItem value="MEDIUM">Moyenne</SelectItem>
                  <SelectItem value="HIGH">Élevée</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date d'échéance */}
          <div>
            <Label className="flex items-center gap-2">
              <Calendar size={18} />
              Date d'échéance
            </Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          {/* Boutons */}
          <DialogFooter>
            {canDelete && (
              <Button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                variant="destructive"
              >
                {loading ? 'Suppression...' : 'Supprimer'}
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
