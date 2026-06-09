# Configuración del Sistema de Campeón

## ¿Qué es el Sistema de Campeón?

Es una característica que añade una capa extra de competencia al juego:

1. **Al registrarse**: Cada usuario predice quién ganará el mundial
2. **Al final**: Se establece el campeón real
3. **Recompensa**: Los usuarios que acertaron reciben +10 puntos bonus

## Equipos Disponibles

El mundial 2026 tendrá estos equipos (45 confirmados):

```
Argentina      Australia      Belgium        Brazil         Canada
Colombia       Costa Rica     Croatia        Denmark        Ecuador
Egypt          England        France         Germany        Ghana
Greece         Hungary        Iran           Italy          Japan
Mexico         Morocco        Netherlands    New Zealand    Nigeria
Norway         Poland         Portugal       Romania        Saudi Arabia
Scotland       Senegal        Serbia         Slovakia       Slovenia
South Africa   South Korea    Spain          Sweden         Switzerland
Turkey         Ukraine        United States  Uruguay        Wales
```

## Flujo de Usuario

### 1. Registro

```
Usuario accede a /register
         ↓
Completa nombre, email, password
         ↓
Selecciona campeón predicho (dropdown)
         ↓
Se envía POST /api/auth/register
         ↓
Usuario se crea con su predicción
```

### 2. Dashboard

En el dashboard, el usuario ve:
- Su nombre
- 🏆 **Su predicción de campeón** (ej: "Argentina")
- El ranking actualizado

### 3. Final del Mundial

Una vez que se determina el campeón:

```bash
npm run set-champion
# Pide: "Ingresa el nombre del campeón: "
# Entrada: Argentina
# Resultado:
# ✅ Campeón establecido: Argentina
# 🎉 5 usuario(s) ganaron 10 puntos por acertar al campeón
```

### 4. Ranking Actualizado

El ranking ahora muestra:

```
Pos | Nombre | 🏆 Campeón | Partidos | Pts Partidos | Pts Campeón | Total Pts
 1  | José   | Argentina  |    15    |      8       |      10     |    18
 2  | Ana    | Brazil     |    14    |     12       |       0     |    12
 3  | Juan   | Argentina  |    12    |      6       |      10     |    16
```

## Administración

### Comando Interactivo (Recomendado)

```bash
npm run set-champion
```

Pasos:
1. Muestra todos los equipos
2. Pide que ingreses el nombre del campeón
3. Valida que sea un equipo válido
4. Otorga puntos automáticamente
5. Muestra cuántos usuarios ganaron

### API Endpoint

```bash
curl -X POST http://localhost:3000/api/champion \
  -H "Authorization: Bearer admin-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "champion": "Argentina",
    "year": 2026
  }'
```

Requiere:
- Header `Authorization: Bearer admin-secret`
- `admin-secret` es el valor de `ADMIN_TOKEN` en `.env.local`

## Detalles Técnicos

### Base de Datos

**Tabla: users**
```sql
championPrediction TEXT    -- Equipo predicho
championPoints INTEGER     -- 0 o 10 (si acertó)
```

**Tabla: world_cup_config**
```sql
year INTEGER UNIQUE        -- 2026
champion TEXT              -- Equipo ganador
updatedAt INTEGER          -- Timestamp
```

### Queries Útiles (SQLite)

Ver quién predijo cada equipo:
```sql
SELECT name, email, COUNT(*) 
FROM users 
WHERE championPrediction = 'Argentina'
GROUP BY championPrediction;
```

Ver cuántos acertaron:
```sql
SELECT championPrediction, COUNT(*) as aciertos
FROM users
WHERE championPoints = 10
GROUP BY championPrediction;
```

Cambiar predicción de un usuario (si es necesario):
```sql
UPDATE users 
SET championPrediction = 'Argentina'
WHERE email = 'user@example.com';
```

## Casos de Uso

### Caso 1: Primero registran usuarios

```bash
# Usuarios se registran en /register
# Cada uno selecciona su predicción

User 1: Argentina
User 2: Brazil
User 3: Argentina
User 4: France
User 5: Argentina
```

### Caso 2: Durante el mundial

```bash
# Los usuarios hacen predicciones de partidos
# El ranking se actualiza con puntos de partidos

npm run update-results  # Cada 15 minutos

# Dashboard muestra puntos de partidos
# Puntos de campeón aún no aparecen (0 para todos)
```

### Caso 3: Después del mundial

```bash
# Se juega la final
# Argentina gana

npm run set-champion
# > Ingresa el nombre del campeón: Argentina
# > ✅ Campeón establecido: Argentina
# > 🎉 3 usuario(s) ganaron 10 puntos por acertar al campeón

# Ranking actualizado:
# - User 1 (Argentina): 8 pts (partidos) + 10 pts (campeón) = 18
# - User 3 (Argentina): 5 pts (partidos) + 10 pts (campeón) = 15
# - User 5 (Argentina): 6 pts (partidos) + 10 pts (campeón) = 16
# - User 2 (Brazil): 7 pts (partidos) + 0 pts (campeón) = 7
# - User 4 (France): 4 pts (partidos) + 0 pts (campeón) = 4
```

## Preguntas Frecuentes

**P: ¿Puedo cambiar mi predicción de campeón después de registrarme?**
R: No, es definitivo. Puedes cambiarla en la BD directamente si es necesario con una query.

**P: ¿Qué pasa si nadie acertó el campeón?**
R: Ningún usuario recibe los 10 puntos. El ranking sigue igual.

**P: ¿Qué pasa si me equivoco al establecer el campeón?**
R: Puedes actualizar:
```sql
UPDATE world_cup_config SET champion = 'Brazil' WHERE year = 2026;
-- Luego ejecuta set-champion de nuevo
```

**P: ¿Puedo usar esto con años anteriores?**
R: Sí, cambia el `year` en el comando/API:
```bash
npm run set-champion  # Edita el script para cambiar year
# O en API: "year": 2022
```

## Integración con Scoring

El sistema automático calcula:

```
RANKING TOTAL = Σ(Puntos de Partidos) + Puntos de Campeón

Máximo posible por usuario:
- 192 puntos de partidos (64 partidos × 3 puntos cada uno)
- 10 puntos de campeón
= 202 puntos máximo
```

Ver [SCORING_SYSTEM.md](SCORING_SYSTEM.md) para más detalles.

## Troubleshooting

**Error: "Equipo no válido"**
- Verifica la ortografía exacta del equipo
- La lista de equipos está en `scripts/set-champion.js`

**Error: "Equipo no encontrado"**
- Los usuarios deben haber predicho exactamente ese nombre
- Mira la tabla de usuarios para ver qué predijeron

**Los puntos no se actualizaron**
- Ejecuta nuevamente: `npm run set-champion`
- O verifica que la BD está actualizada: `npm run migrate-db`

## Notas

- El sistema es flexible y puedes personalizar los 10 puntos en `lib/auth.ts`
- Si necesitas resetear todo: `npm run init-db` (elimina todos los datos)
- Los puntos se guardan automáticamente en la tabla `users`
