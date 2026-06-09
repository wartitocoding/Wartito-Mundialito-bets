# Mundial Bets ⚽

Aplicación web para hacer apuestas de predicciones del mundial en tiempo real.

## Características

- 🔐 Autenticación segura con whitelist de usuarios
- ⚽ Predicción de resultados de partidos
- 🏆 Predicción de campeón mundial al registrarse
- 📊 Ranking en vivo con puntos automáticos
- 🔄 Actualizaciones en tiempo real (cada 10 segundos)
- 📱 Interfaz responsive y fácil de usar
- 💾 Base de datos SQLite local
- 🌐 Integración con API Football para partidos y resultados en vivo
- 🤖 Sistema de puntos dual (partidos + campeón mundial)

## Requisitos

- Node.js 18+ 
- npm o yarn

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Inicializa la base de datos:
```bash
npm run init-db
```

3. Agrega usuarios autorizados a la whitelist (con admin script o directamente en la BD)

4. Inicia el servidor:
```bash
npm run dev
```

5. Abre http://localhost:3000 en tu navegador

## Variables de Entorno

Crea un archivo `.env.local`:
```
JWT_SECRET=tu-clave-secreta-aqui
```

## Estructura de Carpetas

```
/app              - Páginas y API routes
/lib              - Funciones compartidas (DB, auth)
/public           - Archivos estáticos
package.json      - Dependencias
```

## Scripts

- `npm run dev` - Inicia servidor en desarrollo
- `npm run build` - Compila para producción
- `npm run start` - Inicia servidor de producción
- `npm run lint` - Ejecuta eslint
- `npm run sync-matches` - Descarga partidos del mundial desde API
- `npm run update-results` - Actualiza resultados y calcula puntos automáticamente
- `npm run init-db` - Inicializa la base de datos
- `npm run add-user <email>` - Autoriza un nuevo usuario
- `npm run add-match` - Agrega un partido manualmente

## Integración con API Football

La app obtiene partidos y resultados en tiempo real de **api-football.com**:

1. **Obtén tu API key gratis**: https://rapidapi.com/api-sports/api/api-football
2. **Configura en `.env.local`**: `API_FOOTBALL_KEY=tu-clave`
3. **Sincroniza partidos**: `npm run sync-matches`
4. **Actualiza resultados**: `npm run update-results` (automáticamente calcula puntos)

Ver [docs/API_SETUP.md](docs/API_SETUP.md) para más detalles.

## Cómo Usar

1. **Registro**: Solo usuarios en la whitelist pueden registrarse
2. **Dashboard**: Ve los próximos partidos y tu ranking actual
3. **Apostar**: Haz predicciones en los partidos antes de que empiecen
4. **Resultados**: Una vez que se actualicen los resultados, verás los puntos automáticamente

## Gestión de Usuarios

Para agregar usuarios autorizados, necesitas acceder a la base de datos SQLite:

```sql
INSERT INTO allowed_users (email, createdAt) VALUES ('email@example.com', datetime('now'));
```

## Próximas Mejoras

- [ ] Integración con API de resultados real
- [ ] Sistema de notificaciones
- [ ] Historial detallado de apuestas
- [ ] Exportar datos
- [ ] Admin panel para gestionar partidos
