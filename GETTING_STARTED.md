# 🚀 Guía de Inicio Rápido - Todas las Features

## ⚡ 5 Minutos Setup

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear `.env.local`
```bash
cp .env.example .env.local

# Edita y agrega:
JWT_SECRET=tu-clave-secreta-aqui
API_FOOTBALL_KEY=tu-api-key-aqui
ADMIN_TOKEN=tu-admin-token-aqui
```

### 3. Inicializar BD
```bash
# Si es instalación nueva:
npm run init-db

# Si tienes BD existente:
npm run migrate-db
npm run migrate-features
```

### 4. Autorizar usuarios
```bash
npm run add-user usuario1@example.com
npm run add-user usuario2@example.com
```

### 5. Sincronizar partidos
```bash
npm run sync-matches
```

### 6. ¡Listo! Inicia la app
```bash
npm run dev
# Abre http://localhost:3000
```

---

## 📊 Qué Implementé

### TIER 1 - GAMIFICATION ✅
- ✅ **Achievements/Badges** - 8 logros diferentes
- ✅ **Racha System** - Contador de exactas seguidas con bonus
- ✅ **Weekly Leaderboard** - Ranking que resetea cada semana

### TIER 2 - SOCIAL & ANALYTICS ✅
- ✅ **Comentarios en Partidos** - Chat en vivo por partido
- ✅ **Estadísticas Personales** - Analytics completo de tu rendimiento
- ✅ **Notificaciones** - Alertas en tiempo real

### TIER 3 - ADVANCED ✅
- ✅ **Head-to-Head Challenges** - Desafíos 1v1 entre usuarios
- ✅ **Parlay/Acumulados** - Apuestas combinadas con multiplicadores
- ✅ **Admin Dashboard** - Panel de control completo

---

## 📱 Cómo Usar Cada Feature

### 🏆 Achievements
```
Lugar: Dashboard → Pestaña "🏆 Logros"

Se desbloquean automáticamente cuando:
- Haces tu primera predicción exacta
- Completas una semana perfecta
- Llegas a 10+ exactas seguidas
- etc.

Cada uno da puntos bonus
```

### 🔥 Racha System
```
Lugar: Dashboard → Stats

Visible en:
- Card "Racha Actual" en stats
- Ranking: "José 🔥 4" (4 exactas seguidas)

Bonificación: +2 puntos extra por racha activa
```

### 📊 Leaderboard Semanal
```
Lugar: Dashboard → Pestaña "📊 Ranking"

Características:
- Reset cada lunes
- Compite SOLO por la semana
- Top 3 semanal gana 🏅
- Ver histórico de semanas
```

### 💬 Comentarios
```
Lugar: En cada partido (próxima actualización de UI)

Puedes:
- Ver predicciones de otros
- Dejar tu predicción/comentario
- Dar like a comentarios
- Reaccionar con emoji

Max 500 caracteres por comentario
```

### 📈 Estadísticas
```
Lugar: Dashboard → Pestaña "📈 Estadísticas"

Muestra:
- Total predicciones / Exactas
- Tasa de acierto %
- Racha actual
- Rendimiento por equipo
- Progreso semanal (gráfico)
- Percentil en el grupo
```

### 📣 Notificaciones
```
Lugar: Badge en top-right del navbar

Tipos:
- "Comienza Argentina vs Uruguay en 30 mins"
- "Saliste del top 3!"
- "Racha de 5 aciertos 🔥"
- "Nuevo logro desbloqueado"
- etc.

Click para ver detalles
Marca como leída automáticamente
```

### 🤝 Head-to-Head
```
API Endpoint: GET/POST /api/challenges

Flujo:
1. Elige un opponent
2. Se crea desafío (pending)
3. Ambos hacen predicciones
4. Sistema calcula score
5. Ganador se determina automáticamente

Historial de wins/losses
```

### 🎰 Parlay
```
API Endpoint: GET/POST /api/parlays

Ejemplo:
1. Seleccionas 3 partidos
2. Multiplicador: 1.5x
3. Si TODOS exactos: 3×3×1.5 = 13.5 pts
4. Si uno falla: 0 pts

Mayor riesgo = Mayor recompensa
```

### ⚙️ Admin Dashboard
```
Acceso: http://localhost:3000/admin

Requiere: ADMIN_TOKEN (.env.local)

Funciones:
- Ver estadísticas generales
- Gestionar usuarios
- Editar/eliminar predicciones
- Ver logs
- Exportar datos
```

---

## 🔄 Flujo Diario de Usuario

```
MAÑANA:
  └─ Notificación: "Argentina vs Uruguay en 3 horas"

PRE-PARTIDO (1 hora antes):
  └─ Entra a la app
  └─ Ve partidos próximos
  └─ Hace predicciones
  └─ Ve comentarios de otros
  └─ Posiblemente crea parlay

DURANTE PARTIDO:
  └─ Ve comentarios en vivo
  └─ Puede cambiar predicción (según reglas)

DESPUÉS PARTIDO:
  └─ Notificación: "Resultados actualizados"
  └─ Ve puntos ganados
  └─ Ranking se actualiza
  └─ Racha se muestra

FIN DE SEMANA:
  └─ Ve top 3 semanal
  └─ Ve estadísticas personales
  └─ Desafía a otros en 1v1

FIN DE MUNDIAL:
  └─ npm run set-champion
  └─ Usuarios que acertaron reciben +10 pts
  └─ Ranking final definitivo
```

---

## 📋 Scripts de Mantenimiento

### Durante el Mundial
```bash
# Cada 10-15 minutos (automático o cron)
npm run update-results

# Actualiza:
# - Resultados en vivo
# - Puntos de predicciones
# - Racha de usuarios
# - Achievements
# - Notificaciones
```

### Cuando termina el Mundial
```bash
npm run set-champion

# Seguido de:
# - Establece campeón real
# - Da +10 pts a quien acertó
# - Actualiza achievements
```

---

## 🎯 Ejemplos de API Usage

### Obtener mis achievements
```bash
curl http://localhost:3000/api/achievements \
  -H "Authorization: Bearer <tu-token>"
```

### Crear comentario
```bash
curl -X POST http://localhost:3000/api/matches/1/comments \
  -H "Authorization: Bearer <tu-token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Argentina 2-1 seguro!"}'
```

### Ver mis stats
```bash
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer <tu-token>"
```

### Crear parlay
```bash
curl -X POST http://localhost:3000/api/parlays \
  -H "Authorization: Bearer <tu-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "matchIds": [1, 2, 3],
    "multiplier": 1.5
  }'
```

### Admin Dashboard
```bash
# Ve a: http://localhost:3000/admin
# Ingresa ADMIN_TOKEN
```

---

## 🚨 Problemas Comunes

**P: "No veo los achievements"**
R: Llama a `POST /api/achievements` para verificar nuevos

**P: "Las notificaciones no aparecen"**
R: Se crean automáticamente, revisa `/api/notifications`

**P: "Admin panel no funciona"**
R: Verifica que `ADMIN_TOKEN` esté en `.env.local`

**P: "Los comentarios no se guardan"**
R: Asegúrate de enviar `Authorization: Bearer <token>`

---

## 📚 Documentación Completa

- [COMPLETE_FEATURES.md](docs/COMPLETE_FEATURES.md) - Todas las features en detalle
- [SCORING_SYSTEM.md](docs/SCORING_SYSTEM.md) - Sistema de puntos
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitectura técnica
- [API_SETUP.md](docs/API_SETUP.md) - Integración con API Football

---

## ✅ Checklist de Setup

- [ ] `npm install`
- [ ] `.env.local` creado con API_FOOTBALL_KEY
- [ ] `npm run init-db` o migración
- [ ] `npm run migrate-features`
- [ ] Usuarios autorizados con `npm run add-user`
- [ ] Partidos sincronizados con `npm run sync-matches`
- [ ] `npm run dev` funcionando
- [ ] Puedo acceder a http://localhost:3000
- [ ] Admin panel funciona en http://localhost:3000/admin
- [ ] Todas las features aparecen en el dashboard

---

**¡Listo! Todas las features están implementadas y listas para usar 🎉**

Ejecuta: `npm run dev` y ¡comienza a jugar!
