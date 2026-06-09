# Configuración de API Football

Esta guía explica cómo configurar la integración con **api-football.com** para obtener partidos y resultados en tiempo real.

## Paso 1: Obtener API Key

1. Ve a https://rapidapi.com/api-sports/api/api-football
2. Haz clic en "Sign Up" (si no tienes cuenta)
3. Completa el registro
4. Una vez en el dashboard, verás tu **API Key** en la sección "API Key"
5. Copia la clave (será algo como: `abc123def456...`)

## Paso 2: Configurar Variables de Entorno

1. Copia el archivo `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Abre `.env.local` y reemplaza `tu-api-key-aqui` con tu clave real:
   ```
   API_FOOTBALL_KEY=abc123def456...
   ```

3. Opcionalmente, cambia el `JWT_SECRET` y `ADMIN_TOKEN`

## Paso 3: Sincronizar Partidos

Una vez que tengas la API key configurada, puedes sincronizar los partidos del mundial:

```bash
npm run sync-matches
```

Esto descargará todos los partidos del mundial 2026 (o 2022 si 2026 no está disponible) desde la API.

**Nota:** La capa gratuita tiene limitaciones. Si obtienes un error 429 (rate limit), espera unos minutos y vuelve a intentar.

## Paso 4: Actualizar Resultados en Vivo

Para actualizar los resultados de los partidos que están en vivo:

```bash
npm run update-results
```

Este script:
- Obtiene los partidos que están en vivo
- Actualiza los resultados en la base de datos
- **Calcula automáticamente los puntos** de cada predicción basado en:
  - **3 puntos** si acertó el resultado exacto
  - **1 punto** si acertó el ganador (pero no el marcador)
  - **0 puntos** si falló

## Uso Automático (Cron Job)

Puedes configurar un cron job para actualizar resultados automáticamente cada 10 minutos durante el mundial:

### En Linux/Mac:
```bash
*/10 * * * * cd /Users/josetomas/mundial-bets && npm run update-results
```

Agrega esto con `crontab -e`

### En Windows:
Usa el Programador de Tareas para ejecutar `update-results.js` cada 10 minutos.

## API Endpoint para Sincronización

También puedes sincronizar a través de la API:

```bash
curl -X POST http://localhost:3000/api/sync/matches \
  -H "Authorization: Bearer admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "live"}'
```

Parámetros:
- `type: "full"` - Sincroniza todos los partidos del mundial
- `type: "live"` - Actualiza solo los resultados en vivo

## Estructura de Datos

### Tabla `matches`:
- `id` - ID local
- `externalId` - ID de api-football.com
- `team1`, `team2` - Nombres de equipos
- `stage` - Fase del mundial (Grupos, Octavos, etc)
- `date` - Fecha del partido
- `result1`, `result2` - Goles (null si no se ha jugado)
- `status` - Estado (scheduled, live, finished)

### Tabla `predictions`:
- `userId` - ID del usuario que apostó
- `matchId` - ID del partido
- `prediction1`, `prediction2` - Goles predichos
- `points` - Puntos obtenidos (calculados automáticamente)

## Limitaciones y Notas

1. **Rate Limit**: La API gratuita permite ~100 llamadas/día. Si necesitas más, considera pagar.
2. **Datos del 2026**: Estarán disponibles más cercana la fecha del mundial.
3. **Sincronización inicial**: Puede tomar unos segundos si hay muchos partidos.
4. **Cálculo de puntos**: Se hace automáticamente cuando se actualizan los resultados.

## Troubleshooting

**Error: "API_FOOTBALL_KEY no está configurada"**
- Verifica que `.env.local` existe y contiene la clave correctamente

**Error: "HTTP 429"**
- Estás excediendo el rate limit. Espera y vuelve a intentar.

**Error: "No se encontraron partidos"**
- El mundial 2026 aún no está disponible en la API. El script usa 2022 como fallback.

## Alternativas

Si prefieres no usar una API externa:
- Agrega partidos manualmente con `npm run add-match`
- Actualiza resultados manualmente directamente en la BD SQLite
- La app funcionará perfectamente sin la API, solo que de forma manual
