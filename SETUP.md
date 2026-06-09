# Guía Rápida de Instalación

## Opción 1: Instalación Completa con API (Recomendado)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear archivo `.env.local`
```bash
cp .env.example .env.local
```

Edita `.env.local` y reemplaza:
- `JWT_SECRET` - Puede ser cualquier cadena larga y aleatoria
- `API_FOOTBALL_KEY` - Tu clave de api-football.com (ver abajo)

### 3. Obtener API Key (5 minutos)

1. Ve a https://rapidapi.com/api-sports/api/api-football
2. Haz clic en "Sign Up Free"
3. Completa el registro con email y contraseña
4. Una vez registrado, verás tu **API Key** en la página de la API
5. Copia tu clave y pégala en `.env.local`

### 4. Inicializar base de datos
```bash
npm run init-db
```

### 5. Sincronizar partidos del mundial
```bash
npm run sync-matches
```

Esto descargará todos los partidos del mundial 2026 (o 2022 si está disponible).

### 6. Agregar usuarios autorizados
```bash
npm run add-user usuario1@example.com
npm run add-user usuario2@example.com
npm run add-user usuario3@example.com
```

### 7. Iniciar la app
```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador

**Nota**: Al registrarse, cada usuario debe seleccionar su predicción de **campeón mundial** 🏆
Esto otorgará 10 puntos bonus si aciertan al final.

## Opción 2: Instalación Sin API (Manual)

Si no quieres usar la API:

### 1-4. Mismo que arriba, pero **sin API_FOOTBALL_KEY**

### 5. Agregar partidos manualmente
```bash
npm run add-match
```

Te pedirá interactivamente:
- Equipo 1
- Equipo 2
- Fase (Grupos, Octavos, etc)
- Fecha (ej: 2026-06-12 18:00)

### 6-7. Igual que arriba

## Después de Instalar

### Durante el mundial

Actualiza los resultados regularmente:
```bash
npm run update-results
```

Esto:
- Obtiene los partidos en vivo
- Actualiza los resultados
- Calcula automáticamente los puntos de cada predicción

**Automatizar (opcional)**: Agrega a crontab para ejecutar cada 10 minutos:
```bash
*/10 * * * * cd /Users/josetomas/mundial-bets && npm run update-results
```

### Cuando se determina el campeón

Después de que se juegue la final y tengas el campeón del mundial:

```bash
npm run set-champion
```

Te pide:
1. El nombre del equipo campeón (ej: "Argentina")
2. Valida que sea correcto
3. Otorga 10 puntos a todos los que acertaron

**Resultado**:
```
✅ Campeón establecido: Argentina
🎉 5 usuario(s) ganaron 10 puntos por acertar al campeón

Ganadores:
  - José
  - María
  - Carlos
  - Ana
  - Juan
```

El ranking se actualiza automáticamente.

### Gestión de usuarios

Agregar más usuarios:
```bash
npm run add-user newemail@example.com
```

## Usuarios de Ejemplo

Después de `npm run init-db`, estos usuarios están autorizados:
- user1@example.com
- user2@example.com
- user3@example.com

**Password:** Configúralo en el registro (el sistema pedirá crear uno)

## Troubleshooting

**"API_FOOTBALL_KEY no está configurada"**
- Verifica que `.env.local` existe
- Verifica que contiene: `API_FOOTBALL_KEY=tu-clave-real`
- Reinicia el servidor: `npm run dev`

**"No se encontraron partidos"**
- El mundial 2026 aún no está en la API
- El script usará datos de 2022 como fallback
- O agrega partidos manualmente con `npm run add-match`

**Error de rate limit**
- Espera 5 minutos y vuelve a intentar
- El tier gratuito permite ~100 llamadas/día

**Puerto 3000 ya en uso**
```bash
npm run dev -- -p 3001
```

## Estructura de Base de Datos

```
users              - Jugadores registrados
allowed_users      - Whitelist de emails autorizados
matches            - Partidos del mundial
predictions        - Apuestas de los jugadores
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Compilar y ejecutar en producción
npm run build
npm run start

# Base de datos
npm run init-db      # Resetear BD
npm run add-user     # Autorizar usuario
npm run add-match    # Agregar partido manual

# API
npm run sync-matches # Descargar partidos
npm run update-results # Actualizar resultados en vivo
```

## Próximos Pasos

1. Agrega más usuarios autorizados
2. Sincroniza partidos del mundial
3. Invita a tus amigos a registrarse
4. Durante el mundial, ejecuta `npm run update-results` regularmente
5. Ve el ranking actualizar en vivo

¡Listo! La app está lista para usar 🎉
