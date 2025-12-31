'use client';

import { useState } from 'react';
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
import toast from 'react-hot-toast';
import type { Space, CreateSpaceRequest } from '@/types';

export default function BuildingsPage() {
  const { user } = useAuthStore();
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
    co2_baseline: 400,
    has_hydro_gel: false,
    has_temp_check: false,
    has_mask_required: false,
    ventilation_level: 'none',
    max_capacity: undefined,
    current_capacity: undefined,
    cleaning_frequency: 'none',
    has_isolation_room: false,
    social_distancing: false,
  });

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings', user?.tenantId],
    queryFn: () => spacesApi.getByTenant(user?.tenantId || '', 'building'),
    enabled: !!user?.tenantId,
  });

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
        co2_baseline: 400,
        has_hydro_gel: false,
        has_temp_check: false,
        has_mask_required: false,
        ventilation_level: 'none',
        max_capacity: undefined,
        current_capacity: undefined,
        cleaning_frequency: 'none',
        has_isolation_room: false,
        social_distancing: false,
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

            {/* CO2 Baseline */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Baseline CO2</h3>
              <Input
                label="Baseline CO2 (ppm)"
                type="number"
                value={formData.co2_baseline?.toString() || '400'}
                onChange={(e) => setFormData({ ...formData, co2_baseline: parseInt(e.target.value) || 400 })}
                placeholder="400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Valeur de référence pour le CO2. Sera recalculée automatiquement chaque semaine après 7 jours de mesures.
              </p>
            </div>

            {/* Mesures d'hygiène et sécurité */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mesures d'hygiène et sécurité</h3>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_hydro_gel}
                  onChange={(e) => setFormData({ ...formData, has_hydro_gel: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Gel hydro-alcoolique disponible</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_temp_check}
                  onChange={(e) => setFormData({ ...formData, has_temp_check: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Contrôle de température</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_mask_required}
                  onChange={(e) => setFormData({ ...formData, has_mask_required: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Port du masque obligatoire</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_isolation_room}
                  onChange={(e) => setFormData({ ...formData, has_isolation_room: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Salle d'isolement disponible</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.social_distancing}
                  onChange={(e) => setFormData({ ...formData, social_distancing: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Distanciation sociale appliquée</span>
              </label>

              <Select
                label="Niveau de ventilation"
                value={formData.ventilation_level || 'none'}
                onChange={(e) => setFormData({ ...formData, ventilation_level: e.target.value as any })}
                options={[
                  { value: 'none', label: 'Aucune' },
                  { value: 'natural', label: 'Naturelle' },
                  { value: 'mechanical', label: 'Mécanique' },
                  { value: 'hepa', label: 'HEPA (filtration haute efficacité)' },
                ]}
              />

              <Select
                label="Fréquence de nettoyage"
                value={formData.cleaning_frequency || 'none'}
                onChange={(e) => setFormData({ ...formData, cleaning_frequency: e.target.value as any })}
                options={[
                  { value: 'none', label: 'Aucun' },
                  { value: 'weekly', label: 'Hebdomadaire' },
                  { value: 'daily', label: 'Quotidien' },
                  { value: 'hourly', label: 'Horaire' },
                ]}
              />
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
