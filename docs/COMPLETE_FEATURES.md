# 🎉 Guía Completa de Todas las Features

## 📋 Tabla de Contenidos

1. [TIER 1: Gamification](#tier-1-gamification)
2. [TIER 2: Social & Analytics](#tier-2-social--analytics)
3. [TIER 3: Advanced Features](#tier-3-advanced-features)
4. [Scripts y Migrations](#scripts-y-migrations)
5. [API Endpoints](#api-endpoints)

---

## TIER 1: Gamification

### 🏆 Achievements/Badges

**¿Qué es?**
Sistema de logros que se desbloquean automáticamente al alcanzar hitos.

**Logros disponibles:**
- 🎯 **Primera Exacta** - Tu primer resultado exacto
- 🌟 **Semana Perfecta** - Acertar todos los partidos de una semana
- 🔥 **Lucky Bettor** - 10 exactas seguidas
- 👑 **Predictor Maestro** - 100+ exactas en total
- 😲 **Especialista en Sorpresas** - 5+ resultados inesperados
- 🏆 **Campeón Adivinador** - Acertaste el campeón
- ⚡ **Maestro de Rachas** - 20+ exactas seguidas
- 📊 **Analista de Datos** - 500+ partidos predichos

**Cómo funciona:**
```bash
# Los achievements se calculan automáticamente
# Llama a POST /api/achievements para verificar nuevos logros

curl -X POST http://localhost:3000/api/achievements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Respuesta:
{
  "message": "Achievements checked",
  "awarded": ["first_exact", "lucky_bettor"],
  "total": 8
}
```

**UI:**
- Dashboard → Pestaña "🏆 Logros"
- Muestra todos los desbloqueados
- Incluye descripción y puntos bonus

---

### 🔥 Racha/Streak System

**¿Qué es?**
Contador visible de predicciones exactas consecutivas con bonificación.

**Cómo funciona:**
```
Usuario predice:
  Exacto → Racha = 1
  Exacto → Racha = 2
  Exacto → Racha = 3
  Exacto → Racha = 4
  Falla  → Racha = 0 ❌

Bonificación: +2 puntos por cada racha activa
```

**API:**
```bash
GET /api/stats

Respuesta:
{
  "currentStreak": 4,
  "overall": {
    "totalPredictions": 45,
    "successRate": 68.5
  }
}
```

**UI:**
- Mostrado en dashboard
- Visible en ranking: "José 🔥 4"
- Motivación visual

---

### 📊 Leaderboard Semanal

**¿Qué es?**
Ranking separado que se resetea cada semana.

**Cómo funciona:**
```bash
GET /api/rankings/weekly

Respuesta:
{
  "week": 24,
  "year": 2026,
  "rankings": [
    { "name": "José", "points": 45, "correctPredictions": 15 },
    { "name": "Ana", "points": 42, "correctPredictions": 14 },
    ...
  ]
}
```

**Características:**
- Reset automático cada semana
- Compite por la semana
- Top 3 de la semana gana 🏅
- Histórico de todas las semanas

---

## TIER 2: Social & Analytics

### 💬 Comentarios en Partidos

**¿Qué es?**
Chat en vivo por cada partido donde los usuarios comparten predicciones y reacciones.

**Endpoints:**

```bash
# Obtener comentarios de un partido
GET /api/matches/1/comments

# Respuesta:
[
  {
    "id": 1,
    "userId": 5,
    "name": "José",
    "comment": "Argentina gana 2-1 seguro!",
    "likes": 3,
    "createdAt": 1718200000000
  }
]

# Crear comentario
POST /api/matches/1/comments
{
  "comment": "Mi predicción: 2-1 para Argentina"
}
```

**Características:**
- Max 500 caracteres
- Like/Unlike (próximo)
- Respuestas anidadas (próximo)
- Emoji reactions (próximo)

---

### 📈 Estadísticas Personales

**¿Qué es?**
Dashboard de analytics con tu rendimiento detallado.

**Data incluida:**

```bash
GET /api/stats

Respuesta:
{
  "overall": {
    "totalPredictions": 45,
    "exactMatches": 12,
    "correctPredictions": 18,
    "totalPoints": 54,
    "successRate": 68.5
  },
  "byTeam": [
    {
      "team": "Argentina",
      "predictions": 10,
      "wins": 9,
      "exactMatches": 6,
      "winRate": 90.0
    }
  ],
  "weekly": [
    {
      "week": "24",
      "predictions": 8,
      "correct": 6,
      "points": 18
    }
  ],
  "currentStreak": 4
}
```

**UI:**
- Cards con estadísticas principales
- Gráficos de progreso por semana
- Tabla de rendimiento por equipo
- Racha visible

---

### 📣 Notificaciones

**¿Qué es?**
Sistema de alertas en tiempo real para eventos importantes.

**Tipos de notificaciones:**
- ⚽ "Comienza [Equipo] vs [Equipo] en 30 mins"
- 📊 "Saliste del top 3!"
- 🔥 "Racha de 5 aciertos!"
- 🏆 "Nuevo logro desbloqueado"
- 💬 "Respuesta a tu comentario"

**Endpoints:**

```bash
# Obtener notificaciones
GET /api/notifications

# Marcar como leída
PUT /api/notifications
{
  "notificationId": 123
}
```

**UI:**
- Badge en navegación con contador
- Dropdown con últimas 50 notificaciones
- Marcar como leída
- Filtrar por tipo

---

## TIER 3: Advanced Features

### 🤝 Head-to-Head Challenges

**¿Qué es?**
Desafíos 1v1 entre usuarios en partidos seleccionados.

**Endpoints:**

```bash
# Obtener mis desafíos
GET /api/challenges

# Crear desafío
POST /api/challenges
{
  "opponentId": 7
}

# Respuesta:
{
  "id": 1,
  "user1Id": 5,
  "user1Name": "José",
  "user2Id": 7,
  "user2Name": "Ana",
  "status": "pending",
  "user1Score": 0,
  "user2Score": 0
}
```

**Características:**
- Desafía a cualquier usuario
- Historial de wins/losses
- Tabla de "Rivales Clásicos"
- Score se calcula automáticamente

---

### 🎰 Parlay/Acumulados

**¿Qué es?**
Apuestas combinadas donde necesitas acertar TODOS para ganar puntos multiplicados.

**Endpoints:**

```bash
# Obtener parlays
GET /api/parlays

# Crear parlay
POST /api/parlays
{
  "matchIds": [1, 2, 3, 4],
  "multiplier": 1.5
}

# Respuesta:
{
  "id": 1,
  "userId": 5,
  "matches": "[1,2,3,4]",
  "multiplier": 1.5,
  "totalPossiblePoints": 54,
  "status": "active"
}
```

**Ejemplo:**
```
Seleccionas 3 partidos para parlay con 1.5x multiplicador:

Resultado si TODOS exactos:
  3 partidos × 3 puntos × 1.5 = 13.5 puntos

Resultado si uno falla:
  0 puntos (parlay perdido)
```

**Risk/Reward:**
- Mayor riesgo = Mayor recompensa
- Multiplicadores: 1.5x - 3x
- Mínimo 2 partidos

---

### ⚙️ Admin Dashboard

**¿Qué es?**
Panel de control para administradores.

**Acceso:**
```bash
# 1. Ve a http://localhost:3000/admin
# 2. Ingresa el ADMIN_TOKEN (.env.local)
```

**Funcionalidades:**

#### 📊 Dashboard Overview
- Total usuarios
- Total partidos
- Total predicciones
- Precisión promedio
- Top 10 predictores
- Últimos partidos

#### 👤 User Management
```bash
GET /api/admin/stats
  - Ver todos los usuarios
  - Estadísticas de cada uno
  - Actividad reciente
```

#### 🎯 Prediction Management
```bash
# Ver predicciones
GET /api/admin/predictions?userId=5

# Editar predicción
PUT /api/admin/predictions
{
  "predictionId": 123,
  "prediction1": 2,
  "prediction2": 1,
  "points": 3
}

# Eliminar predicción
DELETE /api/admin/predictions
{
  "predictionId": 123
}
```

#### 🎲 Dynamic Odds (Próximo)
- Multiplicadores por dificultad
- Goleadas bonus
- Penalizaciones

---

## Scripts y Migrations

### Instalar nuevas features

```bash
# 1. Migrar BD (si es existente)
npm run migrate-features

# 2. Reiniciar app
npm run dev
```

### Scripts disponibles

```bash
# Base de datos
npm run init-db           # Inicializar (new install)
npm run migrate-db        # Agregar campos campeón
npm run migrate-features  # Agregar nuevas tablas

# Usuarios
npm run add-user          # Autorizar email
npm run set-champion      # Establecer campeón

# Partidos
npm run add-match         # Agregar partido manual
npm run sync-matches      # Descargar desde API
npm run update-results    # Actualizar resultados
```

---

## API Endpoints

### Achievements
```
GET  /api/achievements                    # Mis logros
POST /api/achievements                    # Verificar nuevos
```

### Comments
```
GET  /api/matches/[id]/comments           # Comentarios del partido
POST /api/matches/[id]/comments           # Crear comentario
```

### Notifications
```
GET  /api/notifications                   # Mis notificaciones
PUT  /api/notifications                   # Marcar como leída
POST /api/notifications                   # Crear (interno)
```

### Statistics
```
GET  /api/stats                           # Mi stats completo
GET  /api/rankings                        # Ranking general
GET  /api/rankings/weekly                 # Ranking semanal
```

### Challenges
```
GET  /api/challenges                      # Mis desafíos
POST /api/challenges                      # Crear desafío
```

### Parlays
```
GET  /api/parlays                         # Mis parlays
POST /api/parlays                         # Crear parlay
```

### Admin
```
GET  /api/admin/stats                     # Dashboard overview
GET  /api/admin/predictions               # Ver predicciones
PUT  /api/admin/predictions               # Editar
DELETE /api/admin/predictions             # Eliminar
```

---

## Resumen de Implementación

| Feature | Status | Ubicación |
|---------|--------|-----------|
| Achievements | ✅ | `/lib/achievements.ts`, `/api/achievements` |
| Racha System | ✅ | `/lib/achievements.ts`, `/api/stats` |
| Weekly Leaderboard | ✅ | `/api/rankings/weekly` |
| Comentarios | ✅ | `/api/matches/[id]/comments` |
| Estadísticas | ✅ | `/api/stats` |
| Notificaciones | ✅ | `/api/notifications` |
| Head-to-Head | ✅ | `/api/challenges` |
| Parlays | ✅ | `/api/parlays` |
| Admin Dashboard | ✅ | `/admin`, `/api/admin/*` |

---

## 🚀 Próximos Pasos

1. Ejecutar migración
2. Probar cada feature en el dashboard
3. Personalizar valores (puntos, multiplicadores)
4. Agregar más notificaciones
5. Implementar WebSockets para tiempo real

---

## ⚙️ Personalización

Puedes editar valores en:

- **Puntos de achievements**: `lib/achievements.ts` → `ACHIEVEMENT_INFO`
- **Multiplicadores de parlay**: `app/api/parlays/route.ts`
- **Tiempo de notificaciones**: Crear lógica en `update-results.js`

---

**¡Todas las features están listas para usar! 🎉**
