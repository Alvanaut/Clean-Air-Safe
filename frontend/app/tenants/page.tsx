'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '@/lib/api';
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
import type { Tenant, CreateTenantRequest } from '@/types';

export default function TenantsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    company_name: '',
    contact_email: '',
    contact_phone: '',
  });

  // Redirect if not GODMODE
  if (user?.role !== 'godmode') {
    router.push('/dashboard');
    return null;
  }

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant créé avec succès');
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        company_name: '',
        contact_email: '',
        contact_phone: '',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tenantsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = () => {
    if (!formData.name) {
      toast.error('Le nom est requis');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce tenant?')) {
      deleteMutation.mutate(id);
    }
  };

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
          <h1 className="text-3xl font-bold">Tenants</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            + Nouveau Tenant
          </Button>
        </div>

        <Card>
          <Table
            headers={['Nom', 'Entreprise', 'Contact', 'Status', 'KSP', 'Actions']}
            data={tenants || []}
            renderRow={(tenant: Tenant) => (
              <>
                <td className="px-6 py-4">
                  <p className="font-medium">{tenant.name}</p>
                </td>
                <td className="px-6 py-4">{tenant.company_name || '-'}</td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    {tenant.contact_email && (
                      <p className="text-gray-900 dark:text-gray-100">
                        {tenant.contact_email}
                      </p>
                    )}
                    {tenant.contact_phone && (
                      <p className="text-gray-500">{tenant.contact_phone}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      tenant.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : tenant.status === 'trial'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {tenant.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {tenant.ksp_contract_id ? (
                    <span className="text-green-600 dark:text-green-400">✓ Intégré</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(tenant.id)}
                  >
                    Supprimer
                  </Button>
                </td>
              </>
            )}
          />
        </Card>

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Nouveau Tenant"
        >
          <div className="space-y-4">
            <Input
              label="Nom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mon Entreprise"
              required
            />
            <Input
              label="Nom de l'entreprise"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Mon Entreprise SRL"
            />
            <Input
              label="Email de contact"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="contact@entreprise.com"
            />
            <Input
              label="Téléphone de contact"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              placeholder="+32 2 123 45 67"
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
