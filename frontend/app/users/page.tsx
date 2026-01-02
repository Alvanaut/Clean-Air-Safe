'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
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
import type { User, CreateUserRequest } from '@/types';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'user',
    tenant_id: currentUser?.tenantId || '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  // Fetch tenants for GODMODE users
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await fetch('/api/tenants', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      return result.data;
    },
    enabled: currentUser?.role === 'godmode',
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé avec succès');
      setIsCreateModalOpen(false);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'user',
        tenant_id: currentUser?.tenantId || '',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = () => {
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    // Validation: non-GODMODE users must have a tenant_id
    if (formData.role !== 'godmode' && !formData.tenant_id) {
      toast.error('Veuillez sélectionner un tenant pour cet utilisateur');
      return;
    }

    // For COMPANY_ADMIN, ensure tenant_id is set to their own tenant
    const dataToSubmit = {
      ...formData,
      tenant_id: formData.role === 'godmode'
        ? undefined
        : (currentUser?.role === 'company_admin' ? currentUser.tenantId : formData.tenant_id),
    };

    createMutation.mutate(dataToSubmit);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      deleteMutation.mutate(id);
    }
  };

  const canManageUsers = currentUser?.role === 'godmode' || currentUser?.role === 'company_admin';

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
          <h1 className="text-3xl font-bold">Utilisateurs</h1>
          {canManageUsers && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              + Nouvel Utilisateur
            </Button>
          )}
        </div>

        <Card>
          <Table
            headers={['Nom', 'Email', 'Rôle', 'Status', 'Actions']}
            data={users || []}
            renderRow={(u: User) => (
              <>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">
                      {u.first_name} {u.last_name}
                    </p>
                    {u.phone && (
                      <p className="text-sm text-gray-500">{u.phone}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {u.role?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : u.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {canManageUsers && u.id !== currentUser?.id && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(u.id)}
                    >
                      Supprimer
                    </Button>
                  )}
                </td>
              </>
            )}
          />
        </Card>

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Nouvel Utilisateur"
        >
          <div className="space-y-4">
            <Input
              label="Prénom"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <Input
              label="Nom"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Input
              label="Téléphone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Select
              label="Rôle"
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value as any;
                setFormData({
                  ...formData,
                  role: newRole,
                  // Clear tenant_id if GODMODE role is selected
                  tenant_id: newRole === 'godmode' ? '' : (currentUser?.tenantId || formData.tenant_id)
                });
              }}
              options={[
                { value: 'user', label: 'Utilisateur' },
                { value: 'manager', label: 'Manager' },
                ...(currentUser?.role === 'godmode' ? [
                  { value: 'company_admin', label: 'Admin Entreprise' },
                  { value: 'godmode', label: 'God Mode' },
                ] : []),
              ]}
            />

            {/* Tenant selector - only for GODMODE creating non-GODMODE users */}
            {currentUser?.role === 'godmode' && formData.role !== 'godmode' && (
              <Select
                label="Tenant (Entreprise)"
                value={formData.tenant_id || ''}
                onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                options={[
                  { value: '', label: '-- Sélectionner un tenant --' },
                  ...(tenants || []).map((tenant: any) => ({
                    value: tenant.id,
                    label: tenant.name,
                  })),
                ]}
                required
              />
            )}

            {/* Show current tenant for COMPANY_ADMIN */}
            {currentUser?.role === 'company_admin' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  L'utilisateur sera créé dans votre entreprise
                </p>
              </div>
            )}

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
