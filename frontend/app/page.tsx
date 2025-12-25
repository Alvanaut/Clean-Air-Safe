'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'

export default function Home() {
  const [health, setHealth] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    // Vérifie la santé de l'API
    api.getHealth().then(setHealth).catch(console.error)

    // Récupère les stats
    Promise.all([
      api.getSensors(),
      api.getUsers(),
      api.getSpaces(),
      api.getAlerts({ status: 'pending' }),
    ]).then(([sensors, users, spaces, alerts]) => {
      setStats({
        sensors: sensors.count,
        users: users.count,
        spaces: spaces.count,
        alerts: alerts.count,
      })
    }).catch(console.error)
  }, [])

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-700">
        Vue d'ensemble de votre système CleanAirSafe
      </p>

      {/* Status de l'API */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-medium text-gray-900">Status API</h2>
        {health ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">Backend:</span>
              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                {health.status}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">Database:</span>
              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                {health.services.database}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">Redis:</span>
              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                {health.services.redis}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Chargement...</p>
        )}
      </div>

      {/* Statistiques */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Capteurs"
          value={stats?.sensors ?? '...'}
          link="/sensors"
          color="blue"
        />
        <StatCard
          title="Utilisateurs"
          value={stats?.users ?? '...'}
          link="/users"
          color="green"
        />
        <StatCard
          title="Espaces"
          value={stats?.spaces ?? '...'}
          link="/spaces"
          color="purple"
        />
        <StatCard
          title="Alertes Actives"
          value={stats?.alerts ?? '...'}
          link="/alerts"
          color="red"
        />
      </div>
    </div>
  )
}

function StatCard({ title, value, link, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
  }

  return (
    <Link href={link}>
      <div className={`${colors[color]} overflow-hidden shadow rounded-lg cursor-pointer hover:opacity-90 transition-opacity`}>
        <div className="px-4 py-5 sm:p-6">
          <dt className="text-sm font-medium truncate">{title}</dt>
          <dd className="mt-1 text-3xl font-semibold">{value}</dd>
        </div>
      </div>
    </Link>
  )
}
