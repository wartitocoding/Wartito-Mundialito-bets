# Cómo desplegar Wartito Mundialito Bets

La app usa **SQLite** (archivo en disco). Esto tiene una implicancia importante
para elegir dónde hostearla.

## ⚠️ Vercel NO sirve para esta app

Vercel corre funciones serverless con filesystem de **solo lectura** y sin
estado persistente. SQLite necesita escribir un archivo en disco, así que en
Vercel:
- `initDb()` falla al intentar crear `data/` → todas las rutas dan error 500.
- Aunque escribiera en `/tmp`, cada request puede caer en otra instancia y los
  datos no se comparten ni persisten.

👉 Si tienes el proyecto en Vercel, **bórralo o ignóralo** y usa Railway.
(El `vercel.json` del repo es inofensivo, pero no despliegues ahí.)

## ✅ Despliegue recomendado: Railway

Railway da un contenedor con disco real, donde SQLite funciona perfecto.

### Pasos

1. Entra a https://railway.app y crea un proyecto desde tu repo de GitHub
   (`wartitocoding/Wartito-Mundialito-bets`).

2. **Monta un volumen persistente** (clave para no perder datos en cada deploy):
   - En tu servicio → pestaña **Variables** → **+ New Volume**
   - Mount path: `/data`

3. **Variables de entorno** (pestaña Variables):
   ```
   JWT_SECRET=<genera con: openssl rand -hex 32>
   DATABASE_PATH=/data/bets.db
   ADMIN_TOKEN=<genera con: openssl rand -hex 32>
   ```

4. Railway detecta Next.js solo. Comandos (si te los pide):
   - Build: `npm run build`
   - Start: `npm run start`

5. Deploy. Al primer ingreso al dashboard, la app auto-sincroniza los 104
   partidos del Mundial desde ESPN (no necesitas API key).

6. **Cron de resultados** (para que los marcadores y puntos se actualicen
   solos durante los partidos):
   - Railway → tu servicio → **Cron Jobs** → New
   - Schedule: `*/10 * * * *` (cada 10 min)
   - Command: `curl -fsS "https://<tu-dominio>.up.railway.app/api/admin/sync-espn?token=$ADMIN_TOKEN"`

7. **Autoriza a tus amigos**: el registro es abierto (cualquiera con el link
   puede crear cuenta y elegir su campeón). Solo mándales la URL de Railway.

### Después de cada `git push`
Railway redeploya solo. Gracias al volumen en `/data`, las cuentas y apuestas
**se mantienen**.

## Local (desarrollo)

```bash
npm install
echo "JWT_SECRET=dev-secret-1234567890" > .env.local
npm run init-db        # crea la DB
npm run sync-espn      # carga los partidos
npm run dev            # http://localhost:3000
```
