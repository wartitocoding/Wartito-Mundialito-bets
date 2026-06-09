# Arquitectura de Mundial Bets

## Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                      MUNDO EXTERIOR                          │
├─────────────────────────────────────────────────────────────┤
│         API Football (api-football.com)                      │
│         Proporciona: Partidos + Resultados en Vivo          │
└────────────────────────┬────────────────────────────────────┘
                         │
                  npm run sync-matches
                  npm run update-results
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Next.js)                         │
├─────────────────────────────────────────────────────────────┤
│  /api/matches        - Obtener partidos                      │
│  /api/predictions    - Crear/actualizar predicciones        │
│  /api/rankings       - Obtener ranking                       │
│  /api/sync/matches   - Forzar sincronización (admin)        │
│  /api/auth/*         - Login/Registro                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                    SQLite DB
                    bets.db
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│  / (Home)          - Landing page                            │
│  /login            - Autenticación                           │
│  /register         - Registro (whitelist)                    │
│  /dashboard        - Panel principal                         │
│  /predict/[id]     - Hacer predicción                        │
└─────────────────────────────────────────────────────────────┘
```

## Flujos Principales

### 1. Flujo de Autenticación

```
Usuario → Registro → Validar whitelist → Hash password → BD
                                                        ↓
                     Generar JWT ← Usuario autenticado
```

### 2. Flujo de Predicción

```
Usuario ve partido → Hace predicción → Valida timing → Guarda en BD
                                        (partido no iniciado)
```

### 3. Flujo de Puntuación (Automático)

```
Script update-results:
  1. Obtiene partidos en vivo de API Football
  2. Actualiza resultados en BD
  3. Para cada predicción:
     - Exacto (3-0): 3 puntos
     - Solo ganador: 1 punto
     - Fallo: 0 puntos
  4. Actualiza DB y ranking se recalcula automáticamente
```

## Base de Datos

### Tabla: `users`
```sql
id: INTEGER PRIMARY KEY
email: TEXT UNIQUE
password: TEXT (hasheada con bcryptjs)
name: TEXT
createdAt: INTEGER (timestamp)
```

### Tabla: `allowed_users`
```sql
id: INTEGER PRIMARY KEY
email: TEXT UNIQUE
createdAt: INTEGER
```

### Tabla: `matches`
```sql
id: INTEGER PRIMARY KEY
externalId: INTEGER (de api-football.com)
team1: TEXT
team2: TEXT
stage: TEXT (Grupos, Octavos, etc)
date: TEXT (ISO 8601)
result1: INTEGER NULL (goles antes de jugar)
result2: INTEGER NULL
status: TEXT (scheduled, live, finished)
createdAt: INTEGER
```

### Tabla: `predictions`
```sql
id: INTEGER PRIMARY KEY
userId: INTEGER (FK → users.id)
matchId: INTEGER (FK → matches.id)
prediction1: INTEGER (goles predichos)
prediction2: INTEGER
points: INTEGER (0, 1, o 3)
createdAt: INTEGER
```

## API Endpoints

### Autenticación
```
POST /api/auth/register
POST /api/auth/login
```

### Partidos
```
GET /api/matches           → Todos los partidos
GET /api/matches/upcoming  → Próximos partidos
GET /api/matches/finished  → Partidos terminados
POST /api/matches          → Crear partido (admin)
```

### Predicciones
```
GET /api/predictions       → Mis predicciones (requiere JWT)
POST /api/predictions      → Crear/actualizar predicción
```

### Ranking
```
GET /api/rankings          → Ranking en vivo
```

### Sincronización
```
POST /api/sync/matches     → Forzar sync (requiere ADMIN_TOKEN)
```

## Flujo en Tiempo Real

Frontend actualiza cada 10 segundos:

```
Dashboard:
  setInterval(() => {
    fetchMatches()      // Partidos próximos
    fetchRankings()     // Ranking actualizado
    fetchPredictions()  // Mis apuestas
  }, 10000)
```

Esto asegura que:
- Los usuarios ven el ranking actualizado en vivo
- Los puntos se reflejan inmediatamente después de `update-results`
- Las nuevas predicciones aparecen al instante

## Cálculo de Puntos

La lógica de puntuación se aplica automáticamente cuando se actualiza un resultado:

```javascript
if (prediction.p1 === actual.p1 && prediction.p2 === actual.p2) {
  points = 3  // Exacto
} else if (
  (actual.p1 > actual.p2 && prediction.p1 > prediction.p2) ||
  (actual.p1 < actual.p2 && prediction.p1 < prediction.p2) ||
  (actual.p1 === actual.p2 && prediction.p1 === prediction.p2)
) {
  points = 1  // Solo ganador
} else {
  points = 0  // Falló
}
```

## Scripts de Mantenimiento

### Sincronización Inicial
```bash
npm run sync-matches
# Descarga todos los partidos del mundial de api-football.com
# Se ejecuta una sola vez o para actualizar la lista de partidos
```

### Actualización en Vivo
```bash
npm run update-results
# Ejecutar regularmente (cada 10 min) durante el mundial
# Actualiza resultados y calcula puntos automáticamente
```

### Cron Job (Linux/Mac)
```bash
*/10 * * * * cd /path/to/mundial-bets && npm run update-results
```

## Seguridad

### Autenticación
- JWT tokens en localStorage
- Token verificado en cada request protegido
- Passwords hasheadas con bcryptjs (salt rounds: 10)

### Autorización
- Whitelist de usuarios (`allowed_users` table)
- Solo emails autorizados pueden registrarse
- Admin token para APIs críticas

### Validación
- Las predicciones solo se aceptan antes de que inicie el partido
- Timestamps se validan en cliente y servidor
- Consultas parametrizadas para evitar SQL injection

## Escalabilidad

Para crecer de 5-20 a 100+ usuarios:

1. **Base de datos**: Cambiar de SQLite a PostgreSQL
2. **WebSockets**: Reemplazar polling con Socket.io para tiempo real
3. **Caché**: Agregar Redis para rankings y datos frecuentes
4. **API**: Crear worker separado para sincronización
5. **Frontend**: Agregar infinite scroll o paginación

## Dependencias Principales

```
next@14.2.0              - Framework web
react@18.3.1             - UI library
tailwindcss@3.4.1        - Styling
better-sqlite3@9.2.2     - Base de datos
bcryptjs@2.4.3           - Password hashing
jsonwebtoken@9.1.2       - JWT tokens
dotenv@16.4.5            - Variables de entorno
```

## Notas de Desarrollo

- **Sin WebSockets**: Usa polling simple (10s) que es más que suficiente
- **Sin autenticación OAuth**: JWT simple y efectivo para 20 usuarios
- **Sin servicios externos**: Todo corre localmente excepto la API de resultados
- **Base de datos autocontendida**: Una sola tabla de datos principales

Esto mantiene el proyecto simple, fácil de deployar y sin dependencias complejas.
