import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'à l\'instant';
  if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)}min`;
  if (diffInSeconds < 86400) return `il y a ${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `il y a ${Math.floor(diffInSeconds / 86400)}j`;

  return formatDate(d);
}

export function getDaysUntil(date: string | Date | null): number {
  if (!date) return Infinity;
  const d = new Date(date);
  const now = new Date();
  const diffInMs = d.getTime() - now.getTime();
  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    IN_REVIEW: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    PLANNING: 'bg-purple-100 text-purple-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    TODO: 'À faire',
    IN_PROGRESS: 'En cours',
    IN_REVIEW: 'En révision',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
    PLANNING: 'Planification',
    ON_HOLD: 'En attente',
  };
  return labels[status] || status;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    LOW: 'Faible',
    MEDIUM: 'Moyenne',
    HIGH: 'Haute',
    URGENT: 'Urgente',
  };
  return labels[priority] || priority;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Octets';

  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
