'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api';
import { useAlertNotifications } from '@/hooks/useAlertNotifications';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Alert, AlertStatus } from '@/types';

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('active');

  // Enable real-time alert notifications
  useAlertNotifications();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () =>
      alertsApi.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getSeverityColor = (severity: string) => {
    return severity === 'critical'
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Alertes CO2</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez les alertes de dépassement de seuil CO2
          </p>
        </div>

        {/* Info auto-résolution */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Fonctionnement automatique:</strong> Les alertes se résolvent automatiquement
            lorsque le niveau de CO2 redescend sous le seuil. Si le CO2 reste élevé,
            l'alerte est escaladée au niveau supérieur toutes les 10 minutes.
          </p>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={statusFilter === 'all' ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter('all')}
            size="sm"
          >
            Toutes
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter('active')}
            size="sm"
          >
            Actives
          </Button>
          <Button
            variant={statusFilter === 'resolved' ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter('resolved')}
            size="sm"
          >
            Résolues
          </Button>
        </div>

        {/* Liste des alertes */}
        {!alerts || alerts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg font-medium">Aucune alerte</p>
              <p className="text-sm mt-1">
                {statusFilter === 'all'
                  ? 'Aucune alerte trouvée'
                  : `Aucune alerte ${statusFilter === 'active' ? 'active' : 'résolue'}`}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert: Alert) => (
              <Card key={alert.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">
                        {alert.sensor?.name || 'Capteur inconnu'}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                          alert.severity
                        )}`}
                      >
                        {alert.severity === 'critical' ? 'CRITIQUE' : 'AVERTISSEMENT'}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          alert.status
                        )}`}
                      >
                        {alert.status === 'active' ? 'ACTIVE' : 'RÉSOLUE'}
                      </span>
                    </div>

                    {alert.sensor?.space && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Emplacement: {alert.sensor.space.name}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Niveau CO2</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {alert.co2_level} ppm
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Seuil dépassé</p>
                        <p className="text-lg font-medium">{alert.threshold_exceeded} ppm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Niveau d'escalade
                        </p>
                        <p className="text-lg font-medium">
                          {alert.escalation_level} / 3
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                        <p className="text-sm">
                          {new Date(alert.created_at).toLocaleString('fr-FR', {
                            timeZone: 'Europe/Brussels',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {alert.resolution_note && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          <strong>Résolution:</strong> {alert.resolution_note}
                        </p>
                      </div>
                    )}

                    {alert.resolved_at && (
                      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        Résolue le{' '}
                        {new Date(alert.resolved_at).toLocaleString('fr-FR', {
                          timeZone: 'Europe/Brussels',
                        })}
                      </div>
                    )}
                  </div>

                  {/* Status indicator for active alerts */}
                  {alert.status === 'active' && (
                    <div className="ml-4 flex items-center">
                      <div className="animate-pulse flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          En attente de normalisation
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
