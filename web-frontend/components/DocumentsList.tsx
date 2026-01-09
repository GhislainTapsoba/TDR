'use client';

import { useState, useEffect } from 'react';
import { File, Download, Trash2, Upload, X } from 'lucide-react';
import { documentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate, formatFileSize } from '@/lib/utils';

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

interface DocumentsListProps {
  projectId?: string;
  taskId?: string;
  canUpload?: boolean;
  canDelete?: boolean;
}

export default function DocumentsList({ projectId, taskId, canUpload = false, canDelete = false }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Charger les documents
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (projectId) params.project_id = projectId;
      if (taskId) params.task_id = taskId;

      const response = await documentsApi.getAll(params);
      setDocuments(response.data);
    } catch (err) {
      console.error('Error loading documents:', err);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  // Upload un document
  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    if (!uploadName.trim()) {
      toast.error('Veuillez entrer un nom pour le document');
      return;
    }

    setUploading(true);
    try {
      // Étape 1: Upload du fichier vers Supabase Storage
      const formData = new FormData();
      formData.append('file', uploadFile);

      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload du fichier');
      }

      const uploadData = await uploadResponse.json();

      // Étape 2: Créer l'entrée dans la base de données
      await documentsApi.create({
        name: uploadName,
        file_url: uploadData.file_url,
        file_type: uploadData.file_type || uploadFile.type,
        file_size: uploadData.file_size || uploadFile.size,
        description: uploadDescription || null,
        project_id: projectId || null,
        task_id: taskId || null,
      });

      toast.success('Document uploadé avec succès !');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
      await loadDocuments();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || err.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  // Supprimer un document
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await documentsApi.delete(id);
      toast.success('Document supprimé');
      await loadDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  // Charger au montage
  useEffect(() => {
    loadDocuments();
  }, [projectId, taskId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-gray-500">Chargement des documents...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Documents</h2>
        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Upload size={16} />
            Ajouter un document
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <File size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Aucun document attaché</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <File size={20} className="text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  {doc.description && (
                    <p className="text-sm text-gray-500 truncate">{doc.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {doc.file_size && formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Télécharger"
                >
                  <Download size={18} />
                </a>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Ajouter un document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setUploadFile(file || null);
                      if (file && !uploadName) {
                        setUploadName(file.name);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-full border-2 border-dashed border-gray-400 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-gray-50"
                  >
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-500" />
                      <p className="mt-2 text-base font-medium text-gray-900">
                        {uploadFile ? (
                          <span className="text-blue-700">{uploadFile.name}</span>
                        ) : (
                          <>
                            <span className="text-blue-700">Cliquez pour choisir un fichier</span>
                          </>
                        )}
                      </p>
                      {!uploadFile && (
                        <p className="mt-1 text-sm text-gray-700">
                          ou glissez-déposez le fichier ici
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-600 font-medium">
                        PDF, DOC, XLS, PNG, JPG... (max 10MB)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du document *
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Ex: Rapport final.pdf"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  rows={3}
                  placeholder="Description du document..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile || !uploadName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploading ? 'Upload en cours...' : 'Uploader'}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
