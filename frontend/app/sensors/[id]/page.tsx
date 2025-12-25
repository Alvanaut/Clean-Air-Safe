'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function SensorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sensor, setSensor] = useState<any>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return

    Promise.all([
      api.getSensor(params.id as string),
      api.getSensorMeasurements(params.id as string, { limit: 100 })
    ])
      .then(([sensorData, measurementsData]) => {
        setSensor(sensorData.data)

        // Formate les données pour le graphique
        // Filtre les doublons et formate avec date + heure
        const uniqueMeasurements = (measurementsData.data || [])
          .filter((m: any, index: number, self: any[]) =>
            index === self.findIndex((t) => t.timestamp === m.timestamp)
          )
          .reverse() // Plus ancien au plus récent

        const formattedData = uniqueMeasurements.map((m: any) => {
          const date = new Date(m.timestamp)
          return {
            time: date.toLocaleString('fr-FR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            co2: m.co2Ppm,
            temperature: m.temperature,
            humidity: m.humidity
          }
        })

        setMeasurements(formattedData)
        setLoading(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  if (!sensor) {
    return <div className="text-center py-12">Capteur non trouvé</div>
  }

  const latestMeasurement = measurements[measurements.length - 1]

  return (
    <div className="px-4 sm:px-0">
      {/* En-tête avec bouton retour */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Retour
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{sensor.name}</h1>
        <p className="mt-2 text-sm text-gray-700">
          Device ID: {sensor.deviceId}
        </p>
      </div>

      {/* Informations du capteur */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <InfoCard
          title="Lieu"
          value={sensor.space?.name || 'Non assigné'}
          subtitle={sensor.space?.path}
          color="blue"
        />
        <InfoCard
          title="Responsable"
          value={sensor.responsible?.name || 'Non assigné'}
          subtitle={sensor.responsible?.email}
          color="green"
        />
        <InfoCard
          title="Status"
          value={sensor.status}
          subtitle={`Seuil: ${sensor.thresholdWarning} ppm`}
          color="purple"
        />
        <InfoCard
          title="Entreprise"
          value={sensor.company?.name || 'N/A'}
          subtitle={sensor.company?.reference}
          color="orange"
        />
      </div>

      {/* Mesures en temps réel */}
      {latestMeasurement && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Dernières mesures
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <MeasurementCard
              title="CO2"
              value={latestMeasurement.co2}
              unit="ppm"
              threshold={sensor.thresholdWarning}
              color="blue"
            />
            <MeasurementCard
              title="Température"
              value={latestMeasurement.temperature}
              unit="°C"
              color="orange"
            />
            <MeasurementCard
              title="Humidité"
              value={latestMeasurement.humidity}
              unit="%"
              color="cyan"
            />
          </div>
        </div>
      )}

      {/* Graphiques */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Historique CO2 (dernières {measurements.length} mesures)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={measurements}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="co2"
              stroke="#3b82f6"
              name="CO2 (ppm)"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
        {/* Graphique Température */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Historique Température
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={measurements}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                name="Température (°C)"
                strokeWidth={2}
                dot={{ fill: '#f97316', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique Humidité */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Historique Humidité
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={measurements}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#06b6d4"
                name="Humidité (%)"
                strokeWidth={2}
                dot={{ fill: '#06b6d4', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, value, subtitle, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  }

  return (
    <div className={`${colors[color]} overflow-hidden shadow rounded-lg px-4 py-5 sm:p-6`}>
      <dt className="text-sm font-medium truncate">{title}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
      {subtitle && (
        <dd className="mt-1 text-sm opacity-75 truncate">{subtitle}</dd>
      )}
    </div>
  )
}

function MeasurementCard({ title, value, unit, threshold, color }: any) {
  const colors: any = {
    blue: 'border-blue-500',
    orange: 'border-orange-500',
    cyan: 'border-cyan-500',
  }

  const isWarning = threshold && value > threshold

  return (
    <div className={`border-l-4 ${colors[color]} bg-white p-4 rounded`}>
      <dt className="text-sm font-medium text-gray-500">{title}</dt>
      <dd className={`mt-1 text-3xl font-semibold ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>
        {value?.toFixed(1)} <span className="text-lg text-gray-500">{unit}</span>
      </dd>
      {isWarning && (
        <dd className="mt-1 text-xs text-red-600">⚠️ Seuil dépassé ({threshold} {unit})</dd>
      )}
    </div>
  )
}
