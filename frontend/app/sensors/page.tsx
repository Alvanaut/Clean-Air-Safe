'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sensorsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import type { Sensor, CreateSensorRequest } from '@/types';

export default function SensorsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSensorRequest>({
    name: '',
    description: '',
    ksp_device_id: '',
    tenant_id: user?.tenantId || '',
  });

  const { data: sensors, isLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: sensorsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: sensorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      toast.success('Capteur créé avec succès');
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        ksp_device_id: '',
        tenant_id: user?.tenantId || '',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sensorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      toast.success('Capteur supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.ksp_device_id) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce capteur?')) {
      deleteMutation.mutate(id);
    }
  };

  const canManageSensors = user?.role === 'godmode' || user?.role === 'company_admin';

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
          <h1 className="text-3xl font-bold">Capteurs</h1>
          {canManageSensors && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              + Nouveau Capteur
            </Button>
          )}
        </div>

        <Card>
          <Table
            headers={['Nom', 'Device ID', 'Status', 'QR Code', 'Actions']}
            data={sensors || []}
            renderRow={(sensor: Sensor) => (
              <>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{sensor.name}</p>
                    {sensor.description && (
                      <p className="text-sm text-gray-500">{sensor.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {sensor.ksp_device_id}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sensor.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : sensor.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        : sensor.status === 'maintenance'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {sensor.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => router.push(`/sensors/${sensor.id}`)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Voir QR
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/sensors/${sensor.id}`)}
                    >
                      Détails
                    </Button>
                    {canManageSensors && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(sensor.id)}
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
          title="Nouveau Capteur"
        >
          <div className="space-y-4">
            <Input
              label="Nom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Capteur Bureau 1"
              required
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Capteur CO2 pour le bureau principal"
            />
            <Input
              label="KSP Device ID"
              value={formData.ksp_device_id}
              onChange={(e) => setFormData({ ...formData, ksp_device_id: e.target.value })}
              placeholder="device-12345"
              required
            />
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
