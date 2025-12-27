'use client';

import { useQuery } from '@tanstack/react-query';
import { sensorsApi, usersApi, tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: sensors, isLoading: sensorsLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: sensorsApi.getAll,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.getAll,
    enabled: user?.role === 'godmode',
  });

  if (sensorsLoading || usersLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  const activeSensors = sensors?.filter((s) => s.status === 'active').length || 0;
  const totalSensors = sensors?.length || 0;
  const totalUsers = users?.length || 0;
  const totalTenants = tenants?.length || 0;

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">
          Bienvenue, {user?.first_name} {user?.last_name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Capteurs Actifs
                  </p>
                  <p className="text-3xl font-bold mt-2">{activeSensors}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    sur {totalSensors} total
                  </p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Utilisateurs
                  </p>
                  <p className="text-3xl font-bold mt-2">{totalUsers}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>
          </Card>

          {user?.role === 'godmode' && (
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tenants
                    </p>
                    <p className="text-3xl font-bold mt-2">{totalTenants}</p>
                  </div>
                  <div className="text-4xl">🏢</div>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Votre Rôle
                  </p>
                  <p className="text-xl font-bold mt-2 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-4xl">⭐</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Capteurs Récents</h2>
              <div className="space-y-3">
                {sensors?.slice(0, 5).map((sensor) => (
                  <div
                    key={sensor.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{sensor.name}</p>
                      <p className="text-sm text-gray-500">
                        {sensor.ksp_device_id}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sensor.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {sensor.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Utilisateurs Récents</h2>
              <div className="space-y-3">
                {users?.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
