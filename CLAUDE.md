# Mundial Bets - Instrucciones de Desarrollo

## Stack Técnico
- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT tokens + bcryptjs

## Estructura de Carpetas

```
/app
  /api              - API Routes
    /auth
      /login
      /register
    /matches        - Endpoints de partidos
    /predictions    - Endpoints de predicciones
    /rankings       - Endpoint de ranking
  /dashboard        - Dashboard principal
  /predict/[id]     - Página de predicción
  /login            - Página de login
  /register         - Página de registro
  /page.tsx         - Home

/lib
  /db.ts            - Inicialización y funciones DB
  /auth.ts          - Funciones de autenticación
  /middleware.ts    - Middlewares de autenticación

/scripts
  /init-db.js       - Inicializar base de datos
  /add-user.js      - Agregar usuario a whitelist
  /add-match.js     - Agregar partido

/data
  /bets.db          - SQLite database (generado en runtime)
```

## Scripts Disponibles

- `npm install` - Instalar dependencias
- `npm run init-db` - Inicializar/resetear base de datos
- `npm run migrate-db` - Migrar BD existente a nuevo schema
- `npm run add-user <email>` - Autorizar usuario nuevo
- `npm run add-match` - Agregar partido interactivamente
- `npm run sync-matches` - Sincronizar partidos desde API Football
- `npm run update-results` - Actualizar resultados en vivo y calcular puntos
- `npm run set-champion` - Establecer campeón mundial y otorgar puntos
- `npm run dev` - Iniciar servidor en desarrollo
- `npm run build` - Compilar para producción
- `npm run start` - Iniciar servidor de producción
- `npm run lint` - Ejecutar linter

## Variables de Entorno

Crear `.env.local`:
```
JWT_SECRET=tu-clave-secreta-aqui
```

## Flujo de Autenticación

1. Usuario se registra → Se verifica que esté en whitelist
2. Contraseña se hashea con bcryptjs
3. JWT token se genera y almacena en localStorage
4. Token se envía en header `Authorization: Bearer <token>`
5. Middleware valida el token en rutas protegidas

## Flujo de Registro

1. Usuario se registra en `/register`
2. Completa: Email, Password, Nombre
3. **NUEVO**: Selecciona su predicción de campeón del mundial
4. Se valida whitelist
5. Se crea usuario y token JWT
6. Se redirige a `/dashboard`

## Flujo de Predicciones

1. Usuario ve partidos próximos en dashboard
2. Hace clic en "Apostar" → va a `/predict/[id]`
3. Ingresa su predicción (goles para cada equipo)
4. Se valida que el partido no haya empezado
5. Se guarda o actualiza la predicción en DB
6. Ranking se actualiza automáticamente cada 10s

## Sistema de Puntos (Dual)

### Puntos por Partidos:
- **3 puntos**: Resultado exacto ✅
- **1 punto**: Solo acertó el ganador 🎯
- **0 puntos**: Falló ❌

### Puntos por Campeón:
- **10 puntos**: Acertó al campeón mundial 🏆
- **0 puntos**: No acertó

**Total = Puntos Partidos + Puntos Campeón**

Ver [docs/SCORING_SYSTEM.md](docs/SCORING_SYSTEM.md) para detalles

## Sincronización con ESPN (sin API key)

La app sincroniza fixtures y resultados desde el endpoint público de ESPN
(https://site.web.api.espn.com/.../fifa.world/scoreboard). **No requiere
credenciales.**

### Manual
```bash
npm run sync-espn
```
Trae los 104 partidos del Mundial 2026 (11 jun – 19 jul) y actualiza
fixtures, resultados y puntos en una sola llamada.

### Automático (Railway Cron)
Endpoint protegido: `POST/GET /api/admin/sync-espn`

1. En `.env.local` (y en Railway → Variables):
   ```
   ADMIN_TOKEN=<un-token-largo-y-aleatorio>
   ```
2. En Railway → tu servicio → **Cron Jobs** → New Cron:
   - **Schedule**: `0 * * * *` (cada hora)
   - **Command**: `curl -fsS "https://<tu-dominio>/api/admin/sync-espn?token=$ADMIN_TOKEN"`

Resultado: cada hora se traen fixtures + resultados + recalculan puntos
automáticamente. Sin intervención manual.

### Alternativa: GitHub Actions
Crear `.github/workflows/sync.yml` con un cron que haga `curl` al endpoint.
Útil si Railway Cron no está disponible en tu plan.

## Integración con API Football (legacy, opcional)

La app está integrada con **api-football.com** a través de RapidAPI:

### Cómo funciona:
1. **Sincronizar partidos**: `npm run sync-matches` descarga todos los partidos del mundial
2. **Actualizar resultados**: `npm run update-results` obtiene resultados en vivo y calcula puntos automáticamente
3. **Cálculo de puntos automático**:
   - ✅ Resultado exacto: **3 puntos**
   - ✅ Solo ganador correcto: **1 punto**
   - ❌ Sin aciertos: **0 puntos**

### Obtener API Key:
1. Ve a: https://rapidapi.com/api-sports/api/api-football
2. Regístrate (gratis)
3. Copia tu API key
4. Agrégala a `.env.local`: `API_FOOTBALL_KEY=tu-clave`

Ver [docs/API_SETUP.md](docs/API_SETUP.md) para más detalles.

## Próximas Mejoras Recomendadas

1. ✅ Integración con API de resultados real (api-football.com) - **HECHO**
2. Admin panel para gestionar partidos y resultados manualmente
3. Notificaciones push/email cuando los partidos comienzan
4. Exportar datos a CSV/Excel
5. Histórico detallado de apuestas con estadísticas
6. Sistema de comentarios en partidos
7. Webhook para actualizar resultados automáticamente

## Notas de Desarrollo

- El frontend es principalmente client-side por simplicidad
- Las actualizaciones en tiempo real usan polling (cada 10s) en lugar de WebSockets
- SQLite es suficiente para 5-20 usuarios; para escalar cambiar a PostgreSQL
- La validación de tiempo real se hace en el cliente (localStorage + timestamp)
- No hay sistema de admin completo; edits manuales en DB si es necesario
