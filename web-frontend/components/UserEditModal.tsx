'use client';

import { useState, useEffect } from 'react';
import { usersApi, User } from '@/lib/api';
import toast from 'react-hot-toast';
import { User as UserIcon, Mail, Lock, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { canManageUsers, mapRole } from '@/lib/permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    is_active: userToEdit.is_active,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mettre à jour le formulaire quand l'utilisateur change
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
      is_active: userToEdit.is_active,
    });
  }, [userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !canManageUsers(mapRole(currentUser?.role || ''))) {
      toast.error("Vous n'avez pas la permission de modifier un utilisateur.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Modification de l'utilisateur en cours...");

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserIcon className="text-green-600" size={24} />
            </div>
            Modifier l'Utilisateur
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom */}
          <div>
            <Label className="flex items-center gap-2">
              <UserIcon size={18} />
              Nom complet *
            </Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ex: Jean Dupont"
            />
          </div>

          {/* Email */}
          <div>
            <Label className="flex items-center gap-2">
              <Mail size={18} />
              Email *
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="jean.dupont@example.com"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <Label className="flex items-center gap-2">
              <Lock size={18} />
              Nouveau mot de passe (optionnel)
            </Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={6}
              placeholder="Laissez vide pour ne pas changer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Laissez ce champ vide si vous ne souhaitez pas modifier le mot de passe
            </p>
          </div>

          {/* Rôle */}
          <div>
            <Label className="flex items-center gap-2">
              <Shield size={18} />
              Rôle *
            </Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employe">Employé</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>• <strong>Employé</strong> : Accès de base, peut gérer ses tâches</p>
              <p>• <strong>Manager</strong> : Peut gérer des projets et des équipes</p>
              <p>• <strong>Administrateur</strong> : Accès complet à toutes les fonctionnalités</p>
            </div>
          </div>

          {/* Statut actif */}
          <div>
            <Label className="flex items-center gap-2">
              <Shield size={18} />
              Statut actif
            </Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <span className="text-sm text-muted-foreground">
                {formData.is_active ? 'Utilisateur actif' : 'Utilisateur inactif'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Désactiver pour empêcher l'utilisateur de se connecter.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Note :</strong> La modification du rôle affectera les permissions de l'utilisateur.
            </p>
          </div>

          {/* Boutons */}
          <DialogFooter>
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
              {loading ? 'Modification...' : "Modifier l'utilisateur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
