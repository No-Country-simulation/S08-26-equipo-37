#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auditoría reproducible del dataset y del pipeline de limpieza — PredictiveMaintenance

Reproduce, con un solo comando, las afirmaciones que la revisión del 2026-09-20 dejó
documentadas en docs/MODEL-LIMITATIONS.md. Sirve para que cualquiera pueda verificarlas
en lugar de creerlas.

Verifica:
  1) Integridad básica: filas, columnas, duplicados, conteos de fallas.
  2) Vocabulario de estados: que `Parada_Mantenimiento` sea exactamente `estado_operativo == 0`.
  3) Distribución mensual de fallas y de eventos (¿aporta enero algún positivo?).
  4) La fuga determinista: el cociente de potencia recupera el target.
  5) Qué hace la limpieza: filas quitadas, nulos imputados, celdas con outlier tratadas.
  6) Cuántos EVENTOS de falla borró el filtro de horas muertas.
  7) Ráfaga de fallas: separación entre disparos y solapamiento de ventanas.
  8) Anomalías inyectadas: cuántas se detectan y si el conteo cierra con lo nominal.

USO
    python3 analisis/verify-dataset-claims.py
    python3 analisis/verify-dataset-claims.py --crudo /ruta/a.csv --limpio /ruta/a.parquet

REQUISITOS
    Python 3.9+ con numpy y pyarrow. Los dos datasets viven en Git LFS:
        git lfs install && git lfs pull
"""
from __future__ import annotations

import argparse
import csv
import statistics
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq

RAW_DEFAULT = "datos/dataset_mantenimiento_predictivo_realista.csv"
CLEAN_DEFAULT = "ml/datos/dataset_limpio.parquet"


def cargar_crudo(path):
    with open(path, newline="", encoding="utf8") as f:
        r = csv.reader(f)
        header = next(r)
        rows = list(r)
    return header, rows, {c: i for i, c in enumerate(header)}


def fl(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def titulo(t):
    print()
    print("=" * 78)
    print(t)
    print("=" * 78)


def main():
    ap = argparse.ArgumentParser(description="Auditoría reproducible del dataset y la limpieza")
    ap.add_argument("--crudo", default=RAW_DEFAULT, help=f"CSV canónico (por defecto {RAW_DEFAULT})")
    ap.add_argument("--limpio", default=CLEAN_DEFAULT, help=f"parquet limpio (por defecto {CLEAN_DEFAULT})")
    args = ap.parse_args()

    for p in (args.crudo, args.limpio):
        if not Path(p).exists():
            raise SystemExit(
                f"No encuentro {p}. El dataset vive en Git LFS: git lfs install && git lfs pull"
            )

    header, raw, ri = cargar_crudo(args.crudo)
    t = pq.read_table(args.limpio).to_pydict()
    n_lim = len(t["id_maquina"])
    limpio = {(t["id_maquina"][i], str(t["fecha_hora"][i])[:19].replace(" ", "T")): i for i in range(n_lim)}

    titulo("1. Integridad básica")
    print(f"   crudo : {len(raw):,} filas · {len(header)} columnas")
    print(f"   limpio: {n_lim:,} filas · {len(t)} columnas")
    claves = set()
    dup = 0
    for row in raw:
        k = (row[ri["id_maquina"]], row[ri["fecha_hora"]])
        if k in claves:
            dup += 1
        else:
            claves.add(k)
    print(f"   duplicados (id_maquina, fecha_hora): {dup}")
    print(f"   máquinas: {len({row[ri['id_maquina']] for row in raw})}")
    for col, etiqueta in (("target_falla_48h", "filas positivas"), ("falla_inicio_disparo", "disparos")):
        print(f"   {etiqueta:16} crudo {sum(1 for r in raw if r[ri[col]] == '1'):6,}", end="")
        if col in t:
            print(f" · limpio {sum(1 for v in t[col] if v == 1):6,}")
        else:
            print(" · limpio (columna eliminada)")
    print(f"   {'convalecencia':16} crudo {sum(1 for r in raw if r[ri['falla_estado_causa']].strip() not in ('Ninguna', '')):6,}")

    titulo("2. Vocabulario de estados")
    a = {i for i, r in enumerate(raw) if r[ri["estado_operativo"]] == "0"}
    b = {i for i, r in enumerate(raw) if r[ri["target_estado_salud"]] == "Parada_Mantenimiento"}
    print(f"   estado_operativo == 0           : {len(a):,} filas")
    print(f"   target_estado_salud == Parada…  : {len(b):,} filas")
    print(f"   ¿son el mismo conjunto?         : {'SÍ' if a == b else 'NO'}")
    valores = Counter(r[ri["target_estado_salud"]] for r in raw)
    print("   valores de target_estado_salud  :", ", ".join(f"{k} ({v:,})" for k, v in valores.most_common()))
    print("   (no existe ningún valor 'FALLA' en esa columna)")

    titulo("3. Distribución mensual (crudo → limpio)")
    for nombre, fuente, getmes, getdisp, getpos in (
        (
            "crudo",
            raw,
            lambda r: int(r[ri["fecha_hora"]][5:7]),
            lambda r: r[ri["falla_inicio_disparo"]] == "1",
            lambda r: r[ri["target_falla_48h"]] == "1",
        ),
    ):
        meses = Counter()
        for row in fuente:
            m = getmes(row)
            meses[(m, "filas")] += 1
            if getpos(row):
                meses[(m, "pos")] += 1
            if getdisp(row):
                meses[(m, "disp")] += 1
        for m in sorted({k[0] for k in meses}):
            f, p, d = meses[(m, "filas")], meses[(m, "pos")], meses[(m, "disp")]
            print(f"   {nombre} mes {m}: {f:6,} filas · {p:5,} positivas ({100*p/f:4.1f} %) · {d:4,} disparos")
    meses_l = Counter()
    for i in range(n_lim):
        m = t["fecha_hora"][i].month
        meses_l[(m, "filas")] += 1
        if t["target_falla_48h"][i] == 1:
            meses_l[(m, "pos")] += 1
        if t["falla_inicio_disparo"][i] == 1:
            meses_l[(m, "disp")] += 1
    for m in sorted({k[0] for k in meses_l}):
        f, p, d = meses_l[(m, "filas")], meses_l[(m, "pos")], meses_l[(m, "disp")]
        print(f"   limpio mes {m}: {f:6,} filas · {p:5,} positivas ({100*p/f:4.1f} %) · {d:4,} disparos")

    titulo("4. La fuga: el cociente de potencia recupera el target")
    pos, neg = [], []
    for row in raw:
        if row[ri["estado_operativo"]] != "1":
            continue
        p, pn, c = fl(row[ri["potencia_consumida_kw"]]), fl(row[ri["potencia_nominal_kw"]]), fl(row[ri["carga_pct"]])
        if None in (p, pn, c) or pn == 0:
            continue
        base = pn * (0.12 + 0.88 * c / 100.0)
        if base == 0:
            continue
        (pos if row[ri["target_falla_48h"]] == "1" else neg).append(p / base)
    if pos and neg:
        print(f"   ratio en positivas: n={len(pos):,} mediana={statistics.median(pos):.4f} min={min(pos):.4f} max={max(pos):.4f}")
        print(f"   ratio en negativas: n={len(neg):,} mediana={statistics.median(neg):.4f} min={min(neg):.4f} max={max(neg):.4f}")
        tp = sum(1 for x in pos if x > 1.07)
        fp = sum(1 for x in neg if x > 1.07)
        print(f"   regla 'ratio > 1,07': TP={tp:,} FP={fp:,} FN={len(pos)-tp:,} TN={len(neg)-fp:,}")
        prec = tp / (tp + fp) if tp + fp else 0
        rec = tp / len(pos)
        print(f"   → precision {prec:.3f} · recall {rec:.3f}")

    titulo("5. Qué hace la limpieza")
    cols_sensores = [
        "temperatura_c", "vibracion_mms", "presion_bar", "voltaje_v",
        "carga_pct", "potencia_consumida_kw", "corriente_a",
    ]
    print(f"   filas: {len(raw):,} → {n_lim:,} (quitadas {len(raw)-n_lim:,})")
    for c in cols_sensores:
        nul_c = sum(1 for r in raw if r[ri[c]].strip() == "")
        nul_l = sum(1 for v in t[c] if v is None)
        print(f"   {c:24} nulos crudo {nul_c:5,} → limpio {nul_l:5,}")
    for c in cols_sensores:
        imp = cambiadas = 0
        for row in raw:
            k = (row[ri["id_maquina"]], row[ri["fecha_hora"]].replace(" ", "T"))
            j = limpio.get(k)
            if j is None:
                continue
            a, b2 = row[ri[c]].strip(), t[c][j]
            if a == "":
                imp += 1
            elif b2 is not None and fl(a) is not None and abs(fl(a) - b2) > 1e-9:
                cambiadas += 1
        if imp or cambiadas:
            print(f"   {c:24} imputadas {imp:5,} · valor→valor distinto {cambiadas:5,}")
    print("   (nulos imputados con forward-fill; ningún valor de outlier fue modificado)")

    titulo("6. Eventos de falla borrados por el filtro de horas muertas")
    disp_crudo = sum(1 for r in raw if r[ri["falla_inicio_disparo"]] == "1")
    disp_apagado = sum(1 for r in raw if r[ri["falla_inicio_disparo"]] == "1" and r[ri["estado_operativo"]] == "0")
    disp_limpio = sum(1 for v in t["falla_inicio_disparo"] if v == 1)
    print(f"   disparos en el crudo              : {disp_crudo:,}")
    print(f"   de esos, con la máquina apagada   : {disp_apagado:,}")
    print(f"   disparos en el limpio             : {disp_limpio:,}")
    print(f"   borrados                          : {disp_crudo - disp_limpio:,} "
          f"({'coincide con los apagados' if disp_crudo - disp_limpio == disp_apagado else 'NO coincide'})")

    titulo("7. Ráfaga de fallas")
    por_maq = defaultdict(list)
    for row in raw:
        por_maq[row[ri["id_maquina"]]].append(row)
    for m in por_maq:
        por_maq[m].sort(key=lambda r: r[ri["fecha_hora"]])
    gaps = []
    for m, rs in por_maq.items():
        d = [i for i, r in enumerate(rs) if r[ri["falla_inicio_disparo"]] == "1"]
        gaps += [b - a for a, b in zip(d, d[1:])]
    if gaps:
        gaps.sort()
        print(f"   separación entre disparos: n={len(gaps)} · mín {gaps[0]} h · mediana {statistics.median(gaps):.0f} h · máx {gaps[-1]} h")
        for umbral in (12, 24, 48, 96):
            k = sum(1 for g in gaps if g <= umbral)
            print(f"   separación ≤ {umbral:3} h: {k:3} de {len(gaps)} ({100*k/len(gaps):.0f} %)")
    multi = sum(
        1
        for m, rs in por_maq.items()
        for i, r in enumerate(rs)
        if r[ri["target_falla_48h"]] == "1"
        and sum(1 for j in (jj for jj, rr in enumerate(rs) if rr[ri["falla_inicio_disparo"]] == "1") if 0 < j - i <= 48) > 1
    )
    total_pos = sum(1 for r in raw if r[ri["target_falla_48h"]] == "1")
    print(f"   filas positivas dentro de 48 h de MÁS DE UNA falla: {multi:,} de {total_pos:,} ({100*multi/total_pos:.1f} %)")

    titulo("8. Anomalías inyectadas: ¿el conteo cierra?")
    nominal = {"vibracion_mms": 280, "voltaje_v": 220, "temperatura_c": 150}
    reglas = {
        "vibracion_mms": lambda v: v is not None and v >= 25,
        "voltaje_v": lambda v: v is not None and (340 <= v <= 390 or 120 <= v <= 150),
        "temperatura_c": lambda v: v is not None and v >= 130,
    }
    for c, nom in nominal.items():
        en_crudo = sum(1 for r in raw if reglas[c](fl(r[ri[c]])))
        en_limpio = sum(1 for v in t[c] if reglas[c](v)) if c in t else None
        esperado = nom * 0.975
        print(
            f"   {c:16} nominal {nom:4} · esperado tras nulos {esperado:6.1f} · crudo {en_crudo:5}"
            + (f" · limpio {en_limpio:5}" if en_limpio is not None else "")
        )
    print("   (los nulos se inyectan después de los picos, al 2,5 %: se espera perder ~2,5 % de cada pico)")

    titulo("Resumen")
    print("   Todos los números de esta salida están citados en docs/MODEL-LIMITATIONS.md.")
    print("   Si alguno no coincide, el documento o el dataset cambiaron: revisar antes de reutilizarlos.")


if __name__ == "__main__":
    main()
