# Experimento: segundo target (tipo de falla)

Resultado del experimento propuesto para evaluar un segundo target sobre el dataset actual. **No es
una funcionalidad del producto**: es una medición, con su soporte y sus límites.

## Cómo se corre

```bash
git lfs pull                          # el dataset va por Git LFS (ver docs/DEVELOPMENT.md)
python ml/experiments/tipo_falla.py   # escribe ml/experiments/resultados_tipo_falla.json
```

Requiere el entorno de `ml/api/requirements.txt` (lightgbm, pandas, scikit-learn).

## Pregunta

Si la alerta binaria a 48 h ya avisó, ¿se puede decir **qué** va a fallar? Se entrena con la **misma
matriz de 40 features** y la **misma partición temporal** que el modelo binario (entrena hasta el
31/03/2026, evalúa abril), usando `target_tipo_falla` como etiqueta.

## Resultado

| Métrica | Valor |
|---|---|
| Exactitud | **0,9552** |
| Macro-F1 | **0,9561** |
| Clase mayoritaria (referencia) | 0,4084 |
| Filas de test | 2.412 |

| Clase | Precisión | Recall | Filas de test | **Eventos en el test** |
|---|---|---|---|---|
| `Fallo_Rodamiento` | 0,925 | **1,000** | 530 | **9** |
| `Fallo_Presion_Bomba` | 0,961 | 0,937 | 985 | **19** |
| `Fallo_Motor_Termico` | 0,968 | 0,949 | 897 | **17** |

Matriz de confusión (filas = real, columnas = predicho):

| real \ predicho | Motor térmico | Presión bomba | Rodamiento |
|---|---|---|---|
| Motor térmico | **851** | 37 | 9 |
| Presión bomba | 28 | **923** | 34 |
| Rodamiento | 0 | 0 | **530** |

## Dos comprobaciones que sostienen el número

1. **No es el atajo de la bandera.** Repetido sin `temperatura_critica` ni `vibracion_critica`
   (38 features), el resultado es **idéntico** (0,9552 / 0,9561): el modelo lee la firma física de los
   sensores, no una columna que codifique la etiqueta. Conviene saber que la puerta estaba abierta:
   `temperatura_critica == 1` es cierto en **897 de 897** filas de Motor térmico del test, así que esa
   bandera sola habría bastado para acertar esa clase sin aprender nada.
2. **No es la máquina.** Ninguna de las 25 máquinas tiene un solo tipo de falla (entropía media por
   máquina 1,078 sobre un máximo de 1,099), así que el tipo no se deduce de `id_maquina`.

Las firmas que separan las clases son visibles en los sensores (medianas en la ventana de 48 h):
Motor térmico **89,1 °C** con 3,15 mm/s · Bomba **2,93 bar** con 4,72 mm/s · Rodamiento **7,64 mm/s**
con 72,1 °C.

## Los límites, que van junto al número

- **Soporte real: 45 eventos de falla en el test** (9 a 19 por clase), sobre 121 en todo el dataset. Las
  2.412 filas no son independientes: provienen de esos 45 eventos. El número por fila no se presenta
  sin el conteo de eventos al lado.
- **El dataset es simulado y las firmas las inyecta el generador.** Que las tres causas sean separables
  acá **no** afirma nada sobre una planta real.
- **La etiqueta depende de la ventana de 48 h**: solo hay tipo cuando `target_falla_48h == 1`. El flujo
  realista es de dos etapas (primero la alerta binaria, después el tipo), no un modelo que reemplace al
  primero.
- **El dataset todavía tiene el sobreconsumo del 15 %** en `potencia_consumida_kw` y `corriente_a`
  (issue #48). Acá no se usan: la matriz es la de 40 features sin las columnas derivadas del target.
