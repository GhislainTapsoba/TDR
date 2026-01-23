import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { api, Task as ApiTask } from "@/lib/api";

interface Task extends ApiTask {
  id: number;
  title: string;
}

interface TaskRefusalModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onSave: () => void; // Callback to refresh tasks after refusal
}

export default function TaskRefusalModal({
  isOpen,
  onClose,
  task,
  onSave,
}: TaskRefusalModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmitRefusal = async () => {
    if (!reason.trim()) {
      toast({
        title: "Raison manquante",
        description: "Veuillez fournir une raison pour refuser la tâche.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.post(`/tasks/${task.id}/reject`, { rejectionReason: reason });
      toast({
        title: "Tâche refusée",
        description: `La tâche "${task.title}" a été refusée avec succès.`,
      });
      onSave(); // Refresh tasks list
      onClose();
    } catch (error: any) {
      console.error("Erreur lors du refus de la tâche:", error);
      console.error('Task refusal error status:', error.response?.status); // Debug log
      toast({
        title: "Erreur",
        description: "Échec du refus de la tâche. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Refuser la tâche: {task.title}</DialogTitle>
          <DialogDescription>
            Veuillez indiquer la raison pour laquelle vous refusez cette tâche.
            Cette information sera transmise à votre manager et aux administrateurs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Raison du refus</Label>
            <Textarea
              id="reason"
              placeholder="J'ai déjà trop de tâches..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmitRefusal} disabled={loading}>
            {loading ? "Refus en cours..." : "Refuser la tâche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}