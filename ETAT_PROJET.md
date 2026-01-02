# CleanAirSafe - État du Projet

**Dernière mise à jour:** 31 Décembre 2025

## 📊 Avancement Global: ~92%

### ✅ Fonctionnalités Implémentées

#### Backend (NestJS + PostgreSQL)
- [x] Architecture complète avec modules (Auth, Tenants, Users, Sensors, Spaces, Readings, Sync)
- [x] Base de données PostgreSQL avec TypeORM
- [x] Authentification JWT avec rôles (godmode, company_admin, manager, user)
- [x] API REST complète pour toutes les entités
- [x] **Sync automatique KSP** - Cron job toutes les 10 minutes
- [x] Gestion multi-tenant (Tenants)
- [x] Gestion utilisateurs avec hiérarchie
- [x] **Gestion Spaces/Buildings** (Bâtiment → Étage → Local)
- [x] Stockage des readings (CO2, Température, Humidité)
- [x] QR Code unique par capteur
- [x] Timezone UTC en base + conversion Brussels en frontend
- [x] **WebSocket Gateway** pour mises à jour temps réel
- [x] **Baseline CO2 automatique** - Cron hebdomadaire (Dimanche 3h)
- [x] **Safety Score** - Calcul A-F basé sur critères COVID

#### Frontend (Next.js 14 + React Query)
- [x] Architecture Next.js avec App Router
- [x] Pages: Dashboard, Sensors, Buildings, Users, Tenants
- [x] **Graphique CO2** avec Recharts (affichage 2h)
- [x] **Zones colorées graphique** (vert/orange/rouge basé sur baseline)
- [x] **Lignes de référence** (baseline + seuils orange/rouge)
- [x] **Badge status CO2** avec code couleur dynamique
- [x] Composants UI réutilisables (Card, Button, Table, Modal, Input, Select)
- [x] Auth Store avec Zustand
- [x] React Query pour cache et data fetching
- [x] **WebSocket client** avec hook useWebSocket
- [x] **Invalidation cache temps réel** via WebSocket events
- [x] **Formulaire Buildings** avec adresse complète
- [x] **Dropdown Buildings** dans création capteur
- [x] Affichage building assigné dans détail capteur
- [x] **Correction timezone** - Europe/Brussels sans offset manuel
- [x] Dark mode support
- [x] Sidebar avec navigation par rôle

### ✅ Phase 1 Complétée - Code Couleur CO2

**Principe:** Baseline dynamique par zone + offset

```
Baseline = 5ème percentile du CO2 sur 7 jours (espace vide)

🟢 VERT:   CO2 ≤ Baseline + 500 ppm
🟠 ORANGE:  Baseline + 500 < CO2 ≤ Baseline + 700 ppm
🔴 ROUGE:   CO2 > Baseline + 700 ppm
```

**Implémentation réalisée:**
- [x] Champ `co2_baseline` dans Space entity
- [x] BaselineService avec cron hebdomadaire (Dimanche 3h)
  - Calcul: 5ème percentile CO2 sur 7 jours
  - Défaut: 400 ppm si pas de données
- [x] lib/co2-thresholds.ts pour calcul dynamique
- [x] CO2Chart avec zones colorées + lignes de référence
- [x] Badge status couleur dans sensor detail
- [x] WebSocket pour mises à jour temps réel
- [x] Fix timezone (Europe/Brussels)

### ✅ Phase 2 Complétée - Mises à Jour Temps Réel

**Objectif:** Valider le fonctionnement complet du WebSocket

**Tests effectués:**
- [x] Vérifier réception événements WebSocket dans console browser
- [x] Confirmer invalidation cache React Query automatique
- [x] **Tester mise à jour graphique avec nouvelles données**

**Résultats:**
- ✅ WebSocket se connecte correctement au démarrage de l'application
- ✅ Événements `sync:completed` émis et reçus après chaque synchronisation
- ✅ Cache React Query invalidé automatiquement via WebSocket events
- ✅ **Graphique mis à jour en temps réel sans rafraîchissement manuel**
- ✅ Validation complète avec données test (777 ppm)

**Bug résolu:**
- **Problème:** Event listeners enregistrés avant connexion du socket
- **Solution:** Listeners enregistrés dans l'événement `connect` du socket
- **Fichier:** `frontend/hooks/useWebSocket.ts`
- Les événements sont maintenant reçus et le cache est invalidé correctement

### ❌ Non Implémenté

#### Haute Priorité (Phase 3)
- [ ] **Système d'Alertes**
  - Entité Alert existe en DB
  - Logique de déclenchement à implémenter
  - Notifications email/push
  - Cascade de responsabilité (n+1 si CO2 ne change pas)

#### Moyenne Priorité
- [ ] **Token d'Invitation**
  - Générer token unique par tenant
  - Page d'inscription via token
- [ ] **Assignment Responsables (UI)**
  - Champ `responsible_user_id` existe en DB
  - Manque UI pour assigner responsable à capteur/zone
- [ ] **Champ "Poste" dans User**
  - Ajouter à l'entity et formulaires

#### Basse Priorité
- [ ] **Affichage Batterie**
  - Vérifier disponibilité dans KSP API
  - Ajouter à l'affichage

## 🗂 Structure du Projet

### Backend
```
backend/
├── src/
│   ├── core/
│   │   ├── database/        # Config PostgreSQL + TypeORM
│   │   └── auth/            # JWT + Guards
│   ├── features/
│   │   ├── tenants/         # Multi-tenant
│   │   ├── users/           # Utilisateurs
│   │   ├── sensors/         # Capteurs
│   │   ├── spaces/          # Bâtiments/Zones + Baseline ✅
│   │   ├── readings/        # Mesures CO2
│   │   ├── sync/            # Sync KSP (cron 10min)
│   │   ├── alerts/          # Alertes (DB only)
│   │   └── websocket/       # WebSocket Gateway ✅ NOUVEAU
│   └── app.module.ts
└── .env                     # TZ=UTC
```

### Frontend
```
frontend/
├── app/
│   ├── dashboard/           # Dashboard principal
│   ├── sensors/             # Liste + détail capteurs
│   ├── buildings/           # Gestion bâtiments ✅ NOUVEAU
│   ├── users/               # Gestion utilisateurs
│   └── tenants/             # Gestion tenants
├── components/
│   ├── layout/              # DashboardLayout, Sidebar
│   ├── ui/                  # Card, Button, Table, Modal, Input, Select
│   └── sensors/             # CO2Chart ✅
├── lib/
│   ├── api.ts               # API client (axios)
│   ├── api-client.ts        # Axios instance
│   ├── websocket.ts         # WebSocket client ✅ NOUVEAU
│   └── co2-thresholds.ts    # Calculs seuils CO2 ✅ NOUVEAU
├── hooks/
│   └── useWebSocket.ts      # Hook WebSocket + React Query ✅ NOUVEAU
├── store/
│   └── auth-store.ts        # Zustand store
└── types/
    └── index.ts             # TypeScript types
```

## 🔑 Informations Importantes

### Données de Test
- **User:** test@example.com / Test123!
- **Rôle:** godmode
- **Tenant:** CleanAirSafe Test (`fb88cf49-1481-4d4a-b00f-b9138f5a97c4`)
- **Building test:** Bâtiment ARCSOM (123 Avenue Louise, 1050 Bruxelles)

### Commandes Utiles

#### Démarrer le projet
```bash
# Backend
cd backend
TZ=UTC npm run start:dev

# Frontend
cd frontend
npm run dev
```

#### Fermer tout
```bash
lsof -ti:3000,3001 | xargs kill -9
# ou
pkill -f "nest start"
```

#### Base de données
```bash
# Connection
PGPASSWORD=cleanairsafe_dev_2024 psql -h localhost -U cleanairsafe -d cleanairsafe_db

# Vérifier spaces
SELECT id, name, type, tenant_id FROM spaces WHERE type = 'building';
```

### URLs
- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:3000
- **API Docs:** http://localhost:3000/api

## 📋 Roadmap

### Phase 1 - Code Couleur ✅ COMPLÉTÉ
- [x] Baseline automatique par zone
- [x] Affichage zones colorées graphique
- [x] Badge couleur status CO2
- [x] WebSocket temps réel
- [x] Fix timezone

### Phase 2 - Validation WebSocket ✅ COMPLÉTÉ
- [x] Tests événements temps réel
- [x] Vérification invalidation cache
- [x] Fix bug timing socket connection
- [x] Validation graphique temps réel

### Phase 3 - Alertes
- [ ] Logique déclenchement alertes
- [ ] Email notifications
- [ ] Cascade responsabilité

### Phase 4 - Gestion Utilisateurs
- [ ] Token invitation
- [ ] Assignment responsables UI
- [ ] Champ poste

### Phase 5 - Optimisations
- [ ] Batterie affichage
- [ ] Performance improvements
- [ ] Tests unitaires

## 🏗 Architecture Technique

### Stack
- **Backend:** NestJS 10 + TypeORM + PostgreSQL
- **Frontend:** Next.js 14 + React Query + Tailwind CSS
- **Auth:** JWT
- **Charts:** Recharts
- **State:** Zustand (auth) + React Query (data)

### Flux de Données
```
KSP API → Backend Cron (10min) → PostgreSQL → Backend API → Frontend
                ↓                      ↓            ↓
         Save Readings          WebSocket    React Query
                                   ↓              ↓
                            Frontend Client ← Cache Invalidation
                                   ↓
                              Auto Refresh
```

### Hiérarchie Spaces
```
Tenant
  └── Building (metadata: address, city, postal_code)
      └── Floor
          └── Room/Zone
              └── Sensors
```

### Rôles & Permissions
```
godmode         → Accès total
company_admin   → Gestion tenant
manager         → Gestion zones/capteurs
user            → Lecture seulement
```

## 📞 Contact & Support

- **Projet:** CleanAirSafe - Monitoring qualité de l'air
- **Base:** Réglementation belge CO2
- **API Externe:** Kheiron (KSP)
