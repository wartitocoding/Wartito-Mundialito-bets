# Sistema de Puntuación de Mundial Bets

## Visión General

El sistema de puntuación tiene **dos componentes principales**:

1. **Puntos por Partidos** - Basado en predicciones de resultados
2. **Puntos por Campeón** - Bonificación por acertar al campeón mundial

```
PUNTOS TOTALES = Puntos de Partidos + Puntos de Campeón
```

## 1. Puntos por Partidos (Matches)

Se asignan automáticamente cuando se actualiza un resultado con `npm run update-results`.

### Cálculo:

```
si (predicción exacta) → 3 puntos
si (solo acertó ganador) → 1 punto
si (falló) → 0 puntos
```

### Ejemplos:

| Resultado Real | Tu Predicción | Puntos | Razón |
|---|---|---|---|
| 2-1 | 2-1 | **3** | Exacto ✅ |
| 2-1 | 2-0 | **1** | Ganador correcto (Argentina gana) |
| 2-1 | 1-2 | **0** | Falló |
| 1-1 | 1-1 | **3** | Empate exacto ✅ |
| 1-1 | 0-0 | **0** | Falló |

## 2. Puntos por Campeón (Champion)

Se asignan cuando se establece el campeón mundial con `npm run set-champion`.

### Cálculo:

```
si (acertaste al campeón) → 10 puntos
si (no acertaste) → 0 puntos
```

### Cuándo se otorgan:

1. Al registrarse, cada usuario predice quién será el campeón
2. Una vez que se determine el campeón real, ejecutas: `npm run set-champion`
3. Todos los usuarios que hayan predicho correctamente reciben +10 puntos automáticamente

## Ejemplo Completo de Puntuación

### Usuario: José

**Registro:**
- Nombre: José
- Email: jose@example.com
- Predicción de Campeón: **Argentina** 🇦🇷

**Durante el mundial (3 partidos predichos):**
| Partido | Predicción | Resultado Real | Puntos |
|---|---|---|---|
| Argentina vs Uruguay | 2-1 | 2-1 | **3** |
| Argentina vs México | 1-0 | 2-0 | **1** |
| Argentina vs Francia | 3-2 | 3-3 | **0** |
| **SUBTOTAL PARTIDOS** | | | **4** |

**Final del mundial:**
- Campeón Real: **Argentina** ✅
- Puntos Campeón: **10**

**PUNTUACIÓN FINAL: 4 + 10 = 14 puntos**

## Flujo de Puntuación

```
Usuario se registra
├─ Predice resultado de partidos
├─ Predice campeón mundial
│
Durante el mundial:
├─ npm run update-results
│  └─ Actualiza puntos de partidos automáticamente
│
Después del mundial:
├─ npm run set-champion
│  └─ Otorga 10 puntos a quienes acertaron
│
Dashboard:
└─ Muestra desglose completo de puntos
   ├─ Puntos de partidos
   ├─ Puntos de campeón
   └─ Total
```

## Scripts de Administración

### Actualizar resultados de partidos:
```bash
npm run update-results
```
- Obtiene partidos en vivo de API Football
- Calcula y asigna puntos automáticamente
- Se puede ejecutar múltiples veces durante el mundial

### Establecer el campeón:
```bash
npm run set-champion
```
- Solicita interactivamente el equipo campeón
- Verifica que sea un equipo válido
- Otorga 10 puntos a todos los usuarios que acertaron
- Muestra quiénes ganaron

### O vía API (para admin):
```bash
curl -X POST http://localhost:3000/api/champion \
  -H "Authorization: Bearer admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"champion": "Argentina", "year": 2026}'
```

## Ranking

El ranking se ordena así:

1. **Orden Principal**: Total de Puntos (descendente)
2. **Orden Secundario**: Puntos de Partidos (en caso de empate)
3. **Orden Terciario**: Predicciones Correctas (en caso de empate)

### Desglose en Dashboard:

```
Pos | Nombre | 🏆 Campeón | Partidos | Pts Partidos | Pts Campeón | Total
 1  | José   | Argentina  |    15    |     12       |     10      |  22
 2  | Ana    | Brazil     |    14    |      8       |      0      |   8
 3  | Carlos | España     |    12    |      5       |     10      |  15
```

## Casos Especiales

### ¿Qué pasa si hay empate en puntos?

Se ordena por:
1. Puntos de partidos (quien acertó más resultados)
2. Predicciones correctas (quien tuvo más exactos)
3. Orden de registro (primero registrado gana)

### ¿Puedo cambiar mi predicción de campeón?

No, una vez registrado es definitivo. Esto mantiene la integridad del juego.

### ¿Se pueden cambiar predicciones de partidos?

Sí, mientras el partido no haya empezado. Una vez que la hora de inicio llegó, se bloquean.

## Ajustes Futuros

Puedes personalizar estos valores en `lib/auth.ts`:

```typescript
// Cambiar puntos de resultado exacto
if (exacto) points = 5; // En lugar de 3

// Cambiar puntos de ganador correcto
if (soloGanador) points = 2; // En lugar de 1

// Cambiar puntos de campeón
championPoints = 15; // En lugar de 10
```

## API Endpoints Relevantes

```
GET /api/rankings
- Retorna ranking con desglose de puntos

GET /api/champion
- Obtiene el campeón actual (si está establecido)

POST /api/champion
- Establece el campeón (requiere ADMIN_TOKEN)
- Body: { "champion": "Argentina", "year": 2026 }
```

## Resumen Rápido

| Elemento | Puntos | Cuándo | Cómo |
|---|---|---|---|
| Resultado exacto | 3 | Inmediato | `npm run update-results` |
| Solo ganador | 1 | Inmediato | `npm run update-results` |
| Acertar campeón | 10 | Final | `npm run set-champion` |

**Máximo posible por usuario** (si acertara todo):
- 64 partidos × 3 puntos = 192 puntos (si acertara todos exactos)
- Más 10 puntos por campeón = **202 puntos máximo**

**Mínimo posible**: 0 puntos (si fallara todo)
