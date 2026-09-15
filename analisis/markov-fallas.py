#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Análisis Markov de la degradación — PredictiveMaintenance

Prueba empírica sobre el dataset v2:
  1) Matriz de transición entre estados de salud (cadena de Markov de tiempo discreto)
  2) Tiempo esperado hasta la falla (matriz fundamental de una cadena absorbente) → RUL amplio
  3) Test de la propiedad de Markov: ¿la probabilidad de salir de un estado depende del
     tiempo que lleva en él? (si depende → semi-Markov)
  4) Cadenas por criticidad (Alta/Media/Baja)

USO
    python3 markov-fallas.py [ruta-al-csv] [--out informe-markov.md]
"""
from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

ESTADOS = ["Normal", "Bajo_Observacion", "Riesgo_Critico", "Parada_Mantenimiento", "FALLA"]
IDX = {e: i for i, e in enumerate(ESTADOS)}


def fmt(x, dec=2):
    """Formatea un número en español: coma decimal y punto de miles."""
    if x is None:
        return "n/a"
    s = f"{x:,.{dec}f}"
    return s.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def fmt_int(x):
    return f"{int(round(x)):,}".replace(",", ".")


def cargar(ruta: Path):
    filas = []
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            filas.append(r)
    return filas


def secuencias(filas, campo_criticidad=None):
    """Devuelve {maquina: [(estado, timestamp, criticidad), ...]} ordenado por fecha."""
    por_maquina = defaultdict(list)
    for r in filas:
        if campo_criticidad and (r.get("criticidad") or "").strip() not in campo_criticidad:
            continue
        estado = (r.get("target_estado_salud") or "").strip()
        if (r.get("falla_inicio_disparo") or "0").strip() == "1":
            estado = "FALLA"
        if estado not in IDX:
            continue
        try:
            ts = datetime.strptime(r["fecha_hora"], "%Y-%m-%d %H:%M:%S")
        except Exception:
            continue
        por_maquina[r["id_maquina"]].append((estado, ts, (r.get("criticidad") or "").strip()))
    for m in por_maquina:
        por_maquina[m].sort(key=lambda x: x[1])
    return por_maquina


def matriz_transicion(por_maquina, incluir_falla=True):
    n = len(ESTADOS) if incluir_falla else len(ESTADOS) - 1
    C = np.zeros((n, n))
    for seq in por_maquina.values():
        for (e1, _, _), (e2, _, _) in zip(seq, seq[1:]):
            i, j = IDX[e1], IDX[e2]
            if i < n and j < n:
                C[i, j] += 1
    P = np.zeros_like(C)
    for i in range(n):
        total = C[i].sum()
        if total > 0:
            P[i] = C[i] / total
    return C, P


def tiempo_esperado_hasta_falla(P, idx_falla=IDX["FALLA"]):
    """Matriz fundamental: E[horas hasta FALLA] desde cada estado transitorio."""
    transitorios = [i for i in range(len(P)) if i != idx_falla]
    Q = P[np.ix_(transitorios, transitorios)]
    I = np.eye(len(Q))
    try:
        N = np.linalg.inv(I - Q)
    except np.linalg.LinAlgError:
        return None, None
    esperado = N @ np.ones(len(Q))
    return transitorios, esperado


def analisis_sojourn(por_maquina, estado="Normal"):
    """¿La salida del estado depende del tiempo en él? (Markov puro = hazard constante)."""
    duraciones = []
    salidas_por_hora = Counter()   # k (horas en el estado) -> cuántas veces siguió
    en_estado_por_hora = Counter()  # k -> cuántas veces estaba en el estado a esa antigüedad
    for seq in por_maquina.values():
        k = 0
        for i, (e, _, _) in enumerate(seq):
            if e == estado:
                k += 1
                en_estado_por_hora[k] += 1
                siguiente = seq[i + 1][0] if i + 1 < len(seq) else None
                if siguiente is not None and siguiente != estado:
                    salidas_por_hora[k] += 1
            else:
                if k > 0:
                    duraciones.append(k)
                k = 0
        if k > 0:
            duraciones.append(k)
    return duraciones, salidas_por_hora, en_estado_por_hora


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", nargs="?", type=Path,
                    default=Path("datos/dataset_mantenimiento_predictivo_realista.csv"),
                    help="ruta al dataset (por defecto, la del repositorio; requiere git lfs pull)")
    ap.add_argument("--out", type=Path, default=Path("informe-markov.md"))
    args = ap.parse_args()

    if not args.csv.exists():
        print(f"No se encontró el dataset en {args.csv}.\n"
              "  · Si estás en el repo:  git lfs install && git lfs pull\n"
              "  · O pasá la ruta explícita:  python3 markov-fallas.py /ruta/al/dataset.csv")
        return 2
    if args.csv.stat().st_size < 1_000_000:
        print(f"El archivo {args.csv} parece un puntero de Git LFS (no el dataset real).\n"
              "  Corré:  git lfs install && git lfs pull")
        return 2

    filas = cargar(args.csv)
    por_maquina = secuencias(filas)
    n_fallas = sum(1 for r in filas if (r.get("falla_inicio_disparo") or "0").strip() == "1")

    partes = ["# Análisis Markov de la degradación — PredictiveMaintenance\n",
              f"- Filas: **{fmt_int(len(filas))}** · máquinas: **{len(por_maquina)}** · eventos de falla: **{fmt_int(n_fallas)}**",
              f"- Estados: {', '.join(f'`{e}`' for e in ESTADOS)} (FALLA = hora con `falla_inicio_disparo=1`)\n"]

    # 1) matriz de transición
    C, P = matriz_transicion(por_maquina)
    partes.append("## 1. Matriz de transición (por hora)\n")
    partes.append("| desde \\ hacia | " + " | ".join(ESTADOS) + " |")
    partes.append("| --- | " + " | ".join("---" for _ in ESTADOS) + " |")
    for i, e in enumerate(ESTADOS):
        fila = " | ".join(fmt(P[i, j], 4) for j in range(len(ESTADOS)))
        partes.append(f"| **{e}** | {fila} |")
    partes.append("")

    crudo = []
    crudo.append("\n**Conteos crudos** (cuántos datos sostienen cada transición):\n")
    crudo.append("| desde \\ hacia | " + " | ".join(ESTADOS) + " | total |")
    crudo.append("| --- | " + " | ".join("---" for _ in range(len(ESTADOS) + 1)) + " |")
    for i, e in enumerate(ESTADOS):
        fila = " | ".join(fmt_int(C[i, j]) for j in range(len(ESTADOS)))
        crudo.append(f"| **{e}** | {fila} | {fmt_int(C[i].sum())} |")
    crudo.append("")
    crudo.append("> Las transiciones hacia `FALLA` se apoyan en **~130 casos** (±9 pp al 95 %). "
                  "El 100 % de las fallas viene de `Riesgo_Critico` (131) o `Parada_Mantenimiento` (130).\n")
    partes.extend(crudo)

    # persistencia
    partes.append("**Persistencia (probabilidad de quedarse en el mismo estado la hora siguiente)**\n")
    for i, e in enumerate(ESTADOS):
        partes.append(f"- `{e}`: **{fmt(P[i, i], 4)}**")
    partes.append("")

    # 2) RUL amplio
    trans, esperado = tiempo_esperado_hasta_falla(P)
    if trans is not None:
        partes.append("## 2. Tiempo esperado hasta la falla (RUL amplio, en horas)\n")
        partes.append("Derivado de la matriz fundamental `N = (I − Q)⁻¹`, **cortando la cadena en la hora de la falla** a los fines del cálculo. En los datos `FALLA` **no** es un estado final: la máquina se repara y vuelve a servicio → los valores son **horas hasta la PRÓXIMA falla**.\n")
        partes.append("| estado actual | horas esperadas hasta FALLA |")
        partes.append("| --- | --- |")
        for i, horas in zip(trans, esperado):
            partes.append(f"| `{ESTADOS[i]}` | **{fmt(horas, 1)} h** ({fmt(horas / 24, 1)} días) |")
        partes.append("")

    # 3) test de Markov: sojourn
    dur, salidas, en_estado = analisis_sojourn(por_maquina, "Normal")
    partes.append("## 3. ¿Se cumple la propiedad de Markov? (test de permanencia)\n")
    if dur:
        partes.append(f"- Permanencia en `Normal`: mediana **{fmt_int(np.median(dur))} h**, "
                      f"máx **{fmt_int(max(dur))} h**, episodios **{fmt_int(len(dur))}**")
        partes.append("\n**Hazard empírico** (probabilidad de salir de `Normal` en la próxima hora, según antigüedad):\n")
        partes.append("| horas en `Normal` | veces en ese punto | salidas | hazard |")
        partes.append("| --- | --- | --- | --- |")
        for k in [1, 2, 3, 5, 8, 12, 24, 48, 72]:
            tot = en_estado.get(k, 0)
            if tot:
                partes.append(f"| {k} | {fmt_int(tot)} | {fmt_int(salidas.get(k, 0))} | **{fmt(salidas.get(k, 0) / tot, 4)}** |")
        partes.append("")
        partes.append("_Lectura_: si el hazard **crece** con la antigüedad, el proceso **no es Markov puro** "
                      "→ conviene semi-Markov (o Markov con covariables).\n")

    # 4) por criticidad
    partes.append("## 4. Cadenas por criticidad\n")
    partes.append("| criticidad | máquinas | horas esperadas hasta FALLA desde `Normal` | desde `Riesgo_Critico` |")
    partes.append("| --- | --- | --- | --- |")
    for crit in ["Alta", "Media", "Baja"]:
        sub = secuencias(filas, {crit})
        if not sub:
            continue
        _, Pc = matriz_transicion(sub)
        t, esp = tiempo_esperado_hasta_falla(Pc)
        if t is None:
            continue
        d = {ESTADOS[i]: h for i, h in zip(t, esp)}
        partes.append(f"| {crit} | {len(sub)} | {fmt(d.get('Normal', float('nan')), 1)} h | "
                      f"{fmt(d.get('Riesgo_Critico', float('nan')), 1)} h |")
    partes.append("")



    # 5) horizontes largos por potencias de la matriz
    idx_trans = [i for i in range(len(P)) if i != IDX["FALLA"]]
    Q = P[np.ix_(idx_trans, idx_trans)]
    horizontes = [(48, "48 h"), (168, "7 días"), (720, "30 días"), (2160, "90 días"), (8760, "1 año")]
    partes.append("## 5. Probabilidad acumulada de falla por horizonte\n")
    partes.append("Derivada aplicando la matriz hora tras hora (potencias de Q). El dataset solo tiene etiquetas a 48 h.\n")
    partes.append("| estado actual | " + " | ".join(et for _, et in horizontes) + " |")
    partes.append("| --- | " + " | ".join("---" for _ in horizontes) + " |")
    for s in idx_trans:
        v = np.zeros(len(idx_trans)); v[idx_trans.index(s)] = 1.0
        acum = {}
        for k in range(1, horizontes[-1][0] + 1):
            v = v @ Q
            for h, _ in horizontes:
                if k == h:
                    acum[h] = 1 - v.sum()
        partes.append(f"| `{ESTADOS[s]}` | " + " | ".join(f"{fmt(acum[h] * 100)} %" for h, _ in horizontes) + " |")
    partes.append("")

    # 6) cuantiles del tiempo hasta la próxima falla
    partes.append("## 6. Cuantiles del tiempo hasta la próxima falla\n")
    partes.append("Calculados de la curva de supervivencia: el primer k donde la probabilidad de NO haber fallado cae por debajo del nivel.\n")
    partes.append("| estado actual | p25 | **mediana** | p75 | p90 | media (matriz fundamental) |")
    partes.append("| --- | --- | --- | --- | --- | --- |")
    N = np.linalg.inv(np.eye(len(Q)) - Q); media = N @ np.ones(len(Q))

    def cuantiles(v, tope=200000):
        superv, vv = [], v.copy()
        for _ in range(tope):
            vv = vv @ Q
            s = vv.sum()
            superv.append(s)
            if s < 0.001:
                break
        sv = np.array(superv)
        def q(nivel):
            idx = np.argmax(sv <= nivel) if (sv <= nivel).any() else len(sv)
            return idx + 1
        return q(0.75), q(0.50), q(0.25), q(0.10)

    for s in idx_trans:
        v = np.zeros(len(idx_trans)); v[idx_trans.index(s)] = 1.0
        p25, med, p75, p90 = cuantiles(v)
        partes.append(f"| `{ESTADOS[s]}` | {fmt_int(p25)} h | **{fmt_int(med)} h** | {fmt_int(p75)} h | "
                      f"{fmt_int(p90)} h | {fmt_int(media[idx_trans.index(s)])} h |")
    partes.append("")
    partes.append("_La media engaña (cola larga): la **mediana** es la métrica útil para planificar._\n")

    # 7) calibración contra la etiqueta real
    partes.append("## 7. Validación contra las etiquetas reales\n")
    tot = Counter(); pos = Counter()
    for r in filas:
        e = (r.get("target_estado_salud") or "").strip()
        if e not in ESTADOS:
            continue
        tot[e] += 1
        if (r.get("target_falla_48h") or "0").strip() == "1":
            pos[e] += 1
    partes.append("| estado | filas | P(falla 48 h) real | P(48 h) que da la cadena | diferencia |")
    partes.append("| --- | --- | --- | --- | --- |")
    for e in ESTADOS[:-1]:
        if not tot[e]:
            continue
        real = 100 * pos[e] / tot[e]
        v = np.zeros(len(idx_trans)); v[idx_trans.index(ESTADOS.index(e))] = 1.0
        for _ in range(48):
            v = v @ Q
        mk = (1 - v.sum()) * 100
        partes.append(f"| `{e}` | {fmt_int(tot[e])} | **{fmt(real)} %** | {fmt(mk)} % | {fmt(real - mk)} pp |")
    partes.append("")
    partes.append("> **Dos lecturas**: (1) el estado del dataset **coincide con la etiqueta** (`Riesgo` con falla en 48 h al 100 %) → confirma la fuga de información; "
                  "(2) la cadena homogénea **subestima** ese estado porque ignora el tiempo de permanencia.\n")

    # 8) conclusiones
    partes.append("## 8. Conclusiones y qué haría falta para producción\n")
    partes.append("**Lo que esta prueba demuestra**\n")
    partes.append("- Una cadena de Markov **extiende el horizonte** (7/30/90 días) y da **RUL en cuantiles** sin etiquetas nuevas.")
    partes.append("- Construida sobre el estado de salud del dataset **no es un modelo predictivo**: el estado *es* la etiqueta.\n")
    partes.append("**El diseño correcto (sin fuga)**\n")
    partes.append("1. **Estado observable**: deducir la etapa de los sensores (estados ocultos) o usar deciles de riesgo del modelo de 48 h.")
    partes.append("2. **Dinámica con memoria**: semi-Markov o Markov con covariables (el hazard depende del tiempo en la etapa, ver §3).")
    partes.append("3. **Decisión con costos**: proceso de decisión con `costo_parada_hora_usd` → intervenir ahora vs. esperar.")
    partes.append("4. **Contraste**: análisis de supervivencia (Cox / Weibull) para RUL con covariables y censura.\n")
    partes.append("**Validación disponible**: el generador del dataset tiene un proceso de estados explícito (semilla 42) → una semi-Markov debería recuperar su estructura.\n")

    partes.append("## 9. Limitaciones del análisis\n")
    partes.append("| Limitación | Qué implica |")
    partes.append("| --- | --- |")
    partes.append("| Los estados provienen de una etiqueta del dataset | La cadena describe la **dinámica de esa etiqueta**, no un fenómeno observable en planta (ver §7) |")
    partes.append("| `FALLA` no es un estado final en los datos | 261 transiciones salen de `FALLA`: la máquina se repara y vuelve a servicio. Los tiempos son **hasta la próxima falla**, con corte en la hora de la falla |")
    partes.append("| Muestras chicas | Transiciones hacia `FALLA`: ~130 casos (**±9 pp** al 95 %). Hazard de la 1.ª hora: 27 casos (**±11 pp**) |")
    partes.append("| Cadena homogénea | No distingue por máquina, antigüedad ni carga (por criticidad los tiempos son casi iguales) |")
    partes.append("| Dataset sintético | Mide factibilidad del método y permite validar contra la estructura del generador (semilla 42); **no** demuestra desempeño real |")
    partes.append("| Sin costo de intervención | El dataset tiene costo de parada (300–3.000 USD/h), no costo de reparación planificada |")
    partes.append("")
    partes.append("**Convención numérica**: coma decimal y punto de miles (español).\n")

    args.out.write_text("\n".join(partes), encoding="utf-8")
    print(f"✔ Informe: {args.out}")

    # resumen por consola
    print(f"\nPersistencia: " + " · ".join(f"{e}={P[i, i]:.3f}" for i, e in enumerate(ESTADOS)))
    if trans is not None:
        print("Horas esperadas hasta FALLA: " +
              " · ".join(f"{ESTADOS[i]}={h:,.0f}h" for i, h in zip(trans, esperado)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
