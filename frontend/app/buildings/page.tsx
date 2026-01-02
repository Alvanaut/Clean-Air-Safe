'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spacesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { SAFETY_SCORES, getSafetyScoreDefinition } from '@/lib/safety-scores';
import type { Space, CreateSpaceRequest, SafetyScore } from '@/types';

export default function BuildingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSpaceRequest>({
    name: '',
    description: '',
    type: 'building',
    tenant_id: user?.tenantId || '',
    metadata: {
      address: '',
      city: '',
      postal_code: '',
    },
  });

  const { data: buildings, isLoading, refetch } = useQuery({
    queryKey: ['buildings', user?.tenantId],
    queryFn: () => spacesApi.getByTenant(user?.tenantId || '', 'building'),
    enabled: !!user?.tenantId,
  });

  // Force refetch when component mounts to ensure fresh data
  useEffect(() => {
    if (user?.tenantId) {
      refetch();
    }
  }, [user?.tenantId, refetch]);

  const createMutation = useMutation({
    mutationFn: spacesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Bâtiment créé avec succès');
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        type: 'building',
        tenant_id: user?.tenantId || '',
        metadata: {
          address: '',
          city: '',
          postal_code: '',
        },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: spacesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Bâtiment supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = () => {
    if (!formData.name) {
      toast.error('Veuillez remplir le nom du bâtiment');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bâtiment?')) {
      deleteMutation.mutate(id);
    }
  };

  const canManageBuildings = user?.role === 'godmode' || user?.role === 'company_admin';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Bâtiments</h1>
          {canManageBuildings && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              + Nouveau Bâtiment
            </Button>
          )}
        </div>

        <Card>
          <Table
            headers={['Nom', 'Adresse', 'Ville', 'Code Postal', 'Baseline CO2', 'Score Sécurité', 'Actions']}
            data={buildings || []}
            renderRow={(building: Space) => (
              <>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{building.name}</p>
                    {building.description && (
                      <p className="text-sm text-gray-500">{building.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {building.metadata?.address || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {building.metadata?.city || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {building.metadata?.postal_code || '-'}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {building.co2_baseline} ppm
                </td>
                <td className="px-6 py-4">
                  {building.safety_score ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      building.safety_score === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      building.safety_score === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      building.safety_score === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      building.safety_score === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      building.safety_score === 'E' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {building.safety_score}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/buildings/${building.id}`)}
                    >
                      Détails
                    </Button>
                    {canManageBuildings && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(building.id)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </td>
              </>
            )}
          />
        </Card>

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Nouveau Bâtiment"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Informations de base */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informations de base</h3>
              <Input
                label="Nom du bâtiment"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Bâtiment ARCSOM"
                required
              />
              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Siège social"
              />
              <Input
                label="Adresse"
                value={formData.metadata?.address || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, address: e.target.value },
                  })
                }
                placeholder="123 Avenue Louise"
              />
              <Input
                label="Ville"
                value={formData.metadata?.city || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, city: e.target.value },
                  })
                }
                placeholder="Bruxelles"
              />
              <Input
                label="Code Postal"
                value={formData.metadata?.postal_code || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, postal_code: e.target.value },
                  })
                }
                placeholder="1050"
              />
            </div>


            {/* Score de Sécurité */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Score de Sécurité Sanitaire</h3>

              <Select
                label="Niveau de sécurité (optionnel)"
                value={formData.safety_score || ''}
                onChange={(e) => setFormData({ ...formData, safety_score: e.target.value ? e.target.value as SafetyScore : undefined })}
                options={[
                  { value: '', label: 'Aucun (non applicable)' },
                  ...Object.values(SAFETY_SCORES).map(score => ({
                    value: score.score,
                    label: score.label,
                  }))
                ]}
              />

              {formData.safety_score && (() => {
                const scoreInfo = getSafetyScoreDefinition(formData.safety_score as SafetyScore);
                return scoreInfo && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {scoreInfo.description}
                    </p>
                    {scoreInfo.criteria.length > 0 ? (
                      <ul className="space-y-1">
                        {scoreInfo.criteria.map((criterion, index) => (
                          <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                            <span className="mr-2">✓</span>
                            <span>{criterion}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Aucune mesure sanitaire requise
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Capacité */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Capacité</h3>

              <Input
                label="Capacité maximale"
                type="number"
                value={formData.max_capacity?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="50"
              />

              <Input
                label="Capacité actuelle"
                type="number"
                value={formData.current_capacity?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, current_capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="30"
              />
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
