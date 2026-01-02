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
import type { Space, CreateSpaceRequest, SpaceType, SafetyScore } from '@/types';

export default function BuildingDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSpaceRequest>({
    name: '',
    description: '',
    type: 'floor',
    parent_space_id: params.id,
    tenant_id: user?.tenantId || '',
  });

  const { data: building, isLoading: isBuildingLoading, refetch: refetchBuilding } = useQuery({
    queryKey: ['space', params.id],
    queryFn: () => spacesApi.getById(params.id),
    enabled: !!params.id,
  });

  const { data: subSpaces, isLoading: isSubSpacesLoading, refetch: refetchSubSpaces } = useQuery({
    queryKey: ['subspaces', params.id],
    queryFn: () => spacesApi.getChildren(params.id),
    enabled: !!params.id,
  });

  // Force refetch when component mounts
  useEffect(() => {
    if (params.id) {
      refetchBuilding();
      refetchSubSpaces();
    }
  }, [params.id, refetchBuilding, refetchSubSpaces]);

  const createMutation = useMutation({
    mutationFn: spacesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subspaces', params.id] });
      toast.success('Sous-espace créé avec succès');
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        type: 'floor',
        parent_space_id: params.id,
        tenant_id: user?.tenantId || '',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: spacesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subspaces', params.id] });
      toast.success('Sous-espace supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = () => {
    if (!formData.name) {
      toast.error('Veuillez remplir le nom');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce sous-espace?')) {
      deleteMutation.mutate(id);
    }
  };

  const canManageSpaces = user?.role === 'godmode' || user?.role === 'company_admin';

  const getSpaceTypeLabel = (type: SpaceType) => {
    const labels: Record<SpaceType, string> = {
      building: 'Bâtiment',
      floor: 'Étage',
      room: 'Salle',
      zone: 'Zone',
      area: 'Espace',
    };
    return labels[type] || type;
  };

  if (isBuildingLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!building) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card>
            <div className="p-8 text-center">
              <p className="text-xl text-gray-500">Bâtiment non trouvé</p>
              <Button onClick={() => router.push('/buildings')} className="mt-4">
                Retour aux bâtiments
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="secondary" onClick={() => router.back()}>
            ← Retour
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{building.name}</h1>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {getSpaceTypeLabel(building.type)}
              </span>
            </div>
            {building.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{building.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">Informations</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</dt>
                  <dd className="mt-1 text-lg">{building.name}</dd>
                </div>
                {building.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                    <dd className="mt-1">{building.description}</dd>
                  </div>
                )}
                {building.metadata?.address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</dt>
                    <dd className="mt-1">
                      {building.metadata.address}
                      {building.metadata.postal_code && `, ${building.metadata.postal_code}`}
                      {building.metadata.city && ` ${building.metadata.city}`}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Baseline CO2</dt>
                  <dd className="mt-1 font-medium">{building.co2_baseline} ppm</dd>
                </div>
                {building.safety_score && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Score de Sécurité</dt>
                    <dd className="mt-1">
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
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">Statistiques</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Sous-espaces</dt>
                  <dd className="mt-1 text-2xl font-bold">{subSpaces?.length || 0}</dd>
                </div>
                {building.max_capacity && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Capacité max</dt>
                    <dd className="mt-1 text-2xl font-bold">{building.max_capacity}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Sous-espaces
                {building.type === 'building' && ' (Étages, Zones)'}
                {building.type === 'floor' && ' (Salles, Bureaux)'}
                {building.type === 'room' && ' (Zones)'}
              </h2>
              {canManageSpaces && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  + Nouveau Sous-espace
                </Button>
              )}
            </div>

            {isSubSpacesLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="md" />
              </div>
            ) : subSpaces && subSpaces.length > 0 ? (
              <Table
                headers={['Nom', 'Type', 'Baseline CO2', 'Score', 'Actions']}
                data={subSpaces}
                renderRow={(space: Space) => (
                  <>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{space.name}</p>
                        {space.description && (
                          <p className="text-sm text-gray-500">{space.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {getSpaceTypeLabel(space.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {space.co2_baseline} ppm
                    </td>
                    <td className="px-6 py-4">
                      {space.safety_score ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          space.safety_score === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          space.safety_score === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          space.safety_score === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          space.safety_score === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          space.safety_score === 'E' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {space.safety_score}
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
                          onClick={() => router.push(`/buildings/${space.id}`)}
                        >
                          Voir détails
                        </Button>
                        {canManageSpaces && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(space.id)}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              />
            ) : (
              <p className="text-center text-gray-500 py-8">
                Aucun sous-espace. Créez un étage, une salle ou une zone pour commencer.
              </p>
            )}
          </div>
        </Card>

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Nouveau Sous-espace"
        >
          <div className="space-y-4">
            <Input
              label="Nom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Étage 1, Bureau 101, etc."
              required
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de l'espace"
            />
            <Select
              label="Type d'espace"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as SpaceType })}
              options={[
                { value: 'floor', label: 'Étage' },
                { value: 'room', label: 'Salle / Bureau' },
                { value: 'zone', label: 'Zone' },
                { value: 'area', label: 'Espace' },
              ]}
            />

            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Score de Sécurité</h3>

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
                return scoreInfo && scoreInfo.criteria.length > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <ul className="space-y-1">
                      {scoreInfo.criteria.map((criterion, index) => (
                        <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="mr-2">✓</span>
                          <span>{criterion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 justify-end mt-6">
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
