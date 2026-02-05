'use client';

import React, { useState, useEffect } from 'react';
import { tasksApi, projectsApi, usersApi, stagesApi, Project, User, Stage } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/auth-context';
import { canCreateTask, hasPermission } from '@/lib/permissions';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
} from '@mui/material';

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
    assignees: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      if (user && hasPermission(user.permissions, 'users.read')) {
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
      setStages(data.sort((a, b) => a.position - b.position));
    } catch (error) {
      console.error('Error loading stages:', error);
      setStages([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !canCreateTask(user.permissions)) {
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
      const response = await tasksApi.create({
        title: formData.title,
        description: formData.description || null,
        status: formData.status as any,
        priority: formData.priority as any,
        due_date: formData.due_date || null,
        project_id: formData.project_id,
        stage_id: formData.stage_id || null,
        assignee_ids: formData.assignees,
      } as any);

      // Validate response
      if (!response.data || typeof response.data !== 'object' || !response.data.id) {
        console.error('Invalid task creation response:', response.data);
        toast.error('Réponse invalide du serveur lors de la création de la tâche', { id: toastId });
        return;
      }

      toast.success('Tâche créée avec succès !', { id: toastId });
      setFormData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: '',
        project_id: defaultProjectId || '',
        stage_id: '',
        assignees: [],
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6">
          Nouvelle Tâche
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={3}>
            {/* Titre */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre de la tâche"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                variant="outlined"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={4}
                variant="outlined"
              />
            </Grid>

            {/* Projet */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Projet</InputLabel>
                <Select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  label="Projet"
                >
                  <MenuItem value="">
                    <em>Sélectionner un projet</em>
                  </MenuItem>
                  {Array.isArray(projects) && projects.filter(Boolean).map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Étape */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Étape (optionnel)</InputLabel>
                <Select
                  value={formData.stage_id}
                  onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                  label="Étape (optionnel)"
                >
                  <MenuItem value="">
                    <em>Aucune étape</em>
                  </MenuItem>
                  {Array.isArray(stages) && stages.filter(Boolean).map((stage) => (
                    <MenuItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Statut et Priorité */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Statut"
                >
                  <MenuItem value="TODO">À faire</MenuItem>
                  <MenuItem value="IN_PROGRESS">En cours</MenuItem>
                  <MenuItem value="IN_REVIEW">En révision</MenuItem>
                  <MenuItem value="COMPLETED">Terminée</MenuItem>
                  <MenuItem value="CANCELLED">Annulée</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Priorité"
                >
                  <MenuItem value="LOW">Basse</MenuItem>
                  <MenuItem value="MEDIUM">Moyenne</MenuItem>
                  <MenuItem value="HIGH">Élevée</MenuItem>
                  <MenuItem value="URGENT">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Date d'échéance */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date d'échéance"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} variant="outlined" size="large">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Création...' : 'Créer la tâche'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
