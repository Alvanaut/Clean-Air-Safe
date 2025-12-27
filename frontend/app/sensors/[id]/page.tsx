'use client';

import { useQuery } from '@tanstack/react-query';
import { sensorsApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { CO2Chart } from '@/components/sensors/CO2Chart';

export default function SensorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const { data: sensor, isLoading } = useQuery({
    queryKey: ['sensor', params.id],
    queryFn: () => sensorsApi.getById(params.id),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!sensor) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card>
            <div className="p-8 text-center">
              <p className="text-xl text-gray-500">Capteur non trouvé</p>
              <Button
                onClick={() => router.push('/sensors')}
                className="mt-4"
              >
                Retour aux capteurs
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
          <Button
            variant="secondary"
            onClick={() => router.back()}
          >
            ← Retour
          </Button>
          <h1 className="text-3xl font-bold">{sensor.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">Informations</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Nom
                  </dt>
                  <dd className="mt-1 text-lg">{sensor.name}</dd>
                </div>
                {sensor.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Description
                    </dt>
                    <dd className="mt-1">{sensor.description}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    KSP Device ID
                  </dt>
                  <dd className="mt-1 font-mono text-sm">{sensor.ksp_device_id}</dd>
                </div>
                {sensor.ksp_serial_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Numéro de série
                    </dt>
                    <dd className="mt-1 font-mono text-sm">{sensor.ksp_serial_number}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </dt>
                  <dd className="mt-1">
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
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">QR Code</h2>
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={sensor.qr_code}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="mt-4 text-sm text-gray-500 text-center">
                  Scannez ce code pour accéder au capteur
                </p>
                <p className="mt-2 text-xs text-gray-400 font-mono break-all text-center">
                  {sensor.qr_code}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Dernières Mesures</h2>
              {sensor.last_reading_at ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">CO2</span>
                    <span className="text-2xl font-bold">
                      {sensor.last_reading_co2 || '-'} ppm
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">Température</span>
                    <span className="text-2xl font-bold">
                      {sensor.last_reading_temperature?.toFixed(1) || '-'}°C
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">Humidité</span>
                    <span className="text-2xl font-bold">
                      {sensor.last_reading_humidity?.toFixed(1) || '-'}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Dernière mise à jour:{' '}
                    {new Date(sensor.last_reading_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Aucune mesure disponible
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Synchronisation</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Status Sync
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sensor.sync_status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {sensor.sync_status}
                  </span>
                </div>
                {sensor.last_sync_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Dernière sync
                    </span>
                    <span className="text-sm">
                      {new Date(sensor.last_sync_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                )}
                {sensor.sync_error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {sensor.sync_error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <CO2Chart sensorId={params.id} />
        </div>
      </div>
    </DashboardLayout>
  );
}
