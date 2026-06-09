# Deployment a Vercel 🚀

## Paso 1: Crea cuenta en Vercel

Ve a https://vercel.com y crea una cuenta gratis.

## Paso 2: Importa desde GitHub

1. Abre https://vercel.com/new
2. Elige "Import Git Repository"
3. Conecta tu cuenta de GitHub
4. Busca `mundial-bets`
5. Click en "Import"

## Paso 3: Configura Variables de Entorno

En Vercel, ve a **Settings → Environment Variables** y agrega:

```
JWT_SECRET = (genera una cadena larga aleatoria)
API_FOOTBALL_KEY = (tu clave de api-football.com)
ADMIN_TOKEN = (genera una cadena aleatoria)
```

## Paso 4: Deploy

Click en "Deploy" y espera 2-3 minutos.

**¡Listo!** Tu app estará en: `https://mundial-bets.vercel.app`

---

## ⚠️ Consideraciones Importantes

### Base de Datos SQLite

SQLite funciona en Vercel pero tiene limitaciones:
- Los datos NO persisten entre deploys
- Es ideal para desarrollo/testing
- Para producción, considera PostgreSQL

### Para Producción

Si quieres datos persistentes:
1. Usa Vercel Postgres (gratis inicialmente)
2. O migra a PostgreSQL en otro servidor

### Actualizar la App

Para actualizar después de hacer cambios:

```bash
git add .
git commit -m "Update features"
git push
```

Vercel detecta cambios automáticamente y redeploya.

---

## Compartir con Amigos

Una vez deployed, comparte el link:
```
https://mundial-bets.vercel.app
```

Tus amigos pueden:
1. Ir al link
2. Registrarse (si el email está en whitelist)
3. ¡Empezar a jugar!

---

## Troubleshooting

**"Build failed"**
- Revisa los logs de Vercel
- Verifica que todas las dependencias estén en package.json

**"Database not found"**
- En Vercel, la BD se crea automáticamente al iniciarse
- Es normal que esté vacía

**"Slow requests"**
- Vercel tiene cold starts
- Primera carga puede tardar 5-10 segundos

---

## Próximos Pasos (Opcional)

Para mejor rendimiento, considera:
- Agregar caché en Vercel
- Usar Vercel KV para sesiones
- Migrar a PostgreSQL Vercel
