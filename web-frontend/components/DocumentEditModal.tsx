'use client';

import { useState, useEffect } from 'react';
import { documentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, mapRole } from '@/lib/permissions';

interface Document {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

interface DocumentEditModalProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentEditModal({ document, isOpen, onClose, onSuccess }: DocumentEditModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: document.name,
    description: document.description || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Update form data when document prop changes
    setFormData({
      name: document.name,
      description: document.description || '',
    });
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !hasPermission(mapRole(user.role), 'documents', 'update')) {
      toast.error("Vous n'avez pas la permission de modifier ce document.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Modification du document en cours...");

    try {
      await documentsApi.update(document.id, {
        name: formData.name,
        description: formData.description || null,
      });

      toast.success('Document modifié avec succès !', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating document:', error);
      const message = error.response?.data?.error || "Erreur lors de la modification du document";
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
              <FileText className="text-blue-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Modifier le Document</h2>
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
          {/* Nom */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText size={18} />
              Nom du document *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Ex: Rapport final.pdf"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText size={18} />
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              placeholder="Décrivez le document..."
            />
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
              {loading ? 'Modification...' : "Modifier le document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
