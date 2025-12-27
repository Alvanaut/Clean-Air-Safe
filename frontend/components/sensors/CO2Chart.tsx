'use client';

import { useQuery } from '@tanstack/react-query';
import { sensorsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface CO2ChartProps {
  sensorId: string;
}

export function CO2Chart({ sensorId }: CO2ChartProps) {
  // Calculate time range: last 2 hours
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

  const { data, isLoading, error } = useQuery({
    queryKey: ['sensor-readings', sensorId],
    queryFn: () =>
      sensorsApi.getReadings(sensorId, {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 100,
      }),
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Historique CO2 (2 dernières heures)</h2>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="md" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Historique CO2 (2 dernières heures)</h2>
          <div className="text-center text-red-600 dark:text-red-400 py-8">
            Erreur lors du chargement des données
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Historique CO2 (2 dernières heures)</h2>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Aucune donnée disponible pour les 2 dernières heures
          </div>
        </div>
      </Card>
    );
  }

  // Prepare chart data (reverse to show chronologically)
  const chartData = [...data.data]
    .reverse()
    .map((reading) => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      co2: reading.co2_level,
      temperature: reading.temperature,
      humidity: reading.humidity,
    }));

  // Calculate statistics
  const co2Values = data.data.map((r) => r.co2_level);
  const avgCO2 = Math.round(co2Values.reduce((a, b) => a + b, 0) / co2Values.length);
  const minCO2 = Math.min(...co2Values);
  const maxCO2 = Math.max(...co2Values);

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Historique CO2 (2 dernières heures)</h2>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Min: </span>
              <span className="font-semibold">{minCO2} ppm</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Moy: </span>
              <span className="font-semibold">{avgCO2} ppm</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Max: </span>
              <span className="font-semibold">{maxCO2} ppm</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="timestamp"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fill: 'currentColor' }}
              label={{
                value: 'CO2 (ppm)',
                angle: -90,
                position: 'insideLeft',
                className: 'text-gray-600 dark:text-gray-400',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(var(--background))',
                border: '1px solid rgb(var(--border))',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'rgb(var(--foreground))' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="co2"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
              name="CO2 (ppm)"
            />
          </LineChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          Données actualisées toutes les 10 minutes • {data.total} mesures au total
        </p>
      </div>
    </Card>
  );
}
