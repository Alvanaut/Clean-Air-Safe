'use client';

import { useQuery } from '@tanstack/react-query';
import { sensorsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getCO2Status, getCO2Thresholds } from '@/lib/co2-thresholds';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

interface CO2ChartProps {
  sensorId: string;
  baseline?: number; // CO2 baseline for colored zones
}

export function CO2Chart({ sensorId, baseline = 400 }: CO2ChartProps) {
  // Calculate time range: last 2 hours
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

  // Get CO2 thresholds based on baseline
  const thresholds = getCO2Thresholds(baseline);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sensor-readings', sensorId],
    queryFn: () =>
      sensorsApi.getReadings(sensorId, {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 100,
      }),
    // Primary: WebSocket will trigger real-time updates
    // Fallback: refetch every 5 minutes in case WebSocket fails
    refetchInterval: 5 * 60 * 1000,
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
    .map((reading) => {
      // Use browser's timezone conversion (no manual offset needed)
      const date = new Date(reading.timestamp);

      return {
        timestamp: date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Brussels',
        }),
        co2: reading.co2_level,
        temperature: reading.temperature,
        humidity: reading.humidity,
      };
    });

  // Calculate statistics
  const co2Values = data.data.map((r) => r.co2_level);
  const avgCO2 = Math.round(co2Values.reduce((a, b) => a + b, 0) / co2Values.length);
  const minCO2 = Math.min(...co2Values);
  const maxCO2 = Math.max(...co2Values);

  // Get current CO2 status
  const currentCO2 = data.data[0]?.co2_level || 0;
  const currentStatus = getCO2Status(currentCO2, baseline);

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Historique CO2 (2 dernières heures)</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-sm px-3 py-1 rounded-full ${currentStatus.bgColor} ${currentStatus.textColor} font-medium`}>
                {currentStatus.label}
              </span>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-sm opacity-30"></div>
                  <span className="text-gray-600 dark:text-gray-400">≤ {thresholds.green} ppm</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm opacity-30"></div>
                  <span className="text-gray-600 dark:text-gray-400">{thresholds.green}-{thresholds.orange} ppm</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-sm opacity-30"></div>
                  <span className="text-gray-600 dark:text-gray-400">&gt; {thresholds.orange} ppm</span>
                </div>
              </div>
            </div>
          </div>
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

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />

            {/* Green zone: 0 to baseline + 500 */}
            <ReferenceArea
              y1={0}
              y2={thresholds.green}
              fill="#10b981"
              fillOpacity={0.15}
              ifOverflow="extendDomain"
            />

            {/* Orange zone: baseline + 500 to baseline + 700 */}
            <ReferenceArea
              y1={thresholds.green}
              y2={thresholds.orange}
              fill="#f59e0b"
              fillOpacity={0.15}
              ifOverflow="extendDomain"
            />

            {/* Red zone: above baseline + 700 */}
            <ReferenceArea
              y1={thresholds.orange}
              y2={Math.max(maxCO2 + 200, thresholds.orange + 500)}
              fill="#ef4444"
              fillOpacity={0.15}
              ifOverflow="extendDomain"
            />

            {/* Reference line for baseline */}
            <ReferenceLine
              y={baseline}
              stroke="#6b7280"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Baseline (${baseline} ppm)`,
                position: 'insideTopLeft',
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 500,
              }}
            />

            {/* Reference line for green/orange threshold */}
            <ReferenceLine
              y={thresholds.green}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={2}
              label={{
                value: `Seuil Orange (${thresholds.green} ppm)`,
                position: 'insideTopLeft',
                fill: '#f59e0b',
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {/* Reference line for orange/red threshold */}
            <ReferenceLine
              y={thresholds.orange}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={2}
              label={{
                value: `Seuil Rouge (${thresholds.orange} ppm)`,
                position: 'insideTopLeft',
                fill: '#ef4444',
                fontSize: 11,
                fontWeight: 600,
              }}
            />

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
          ⚡ Mises à jour en temps réel via WebSocket • {data.total} mesures au total • Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
        </p>
      </div>
    </Card>
  );
}
