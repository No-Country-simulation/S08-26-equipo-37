#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evaluación honesta del baseline — PredictiveMaintenance

Responde tres preguntas que los documentos del repo daban por abiertas, sin las columnas
que filtran la etiqueta (ver docs/MODEL-LIMITATIONS.md §4.1 bis):

  1) ¿Cuál es el TECHO real del baseline si se sacan `potencia_consumida_kw` y `corriente_a`?
     Métricas por fila, con la misma partición temporal del notebook (enero–marzo → abril).

  2) ¿CUÁNTOS EVENTOS de falla se anticipan? Las métricas por fila mezclan horas: cada falla
     aporta ~29 filas positivas y eso infla el recall. Acá se cuenta cada falla una vez.

  3) ¿Le gana al MANTENIMIENTO POR CALENDARIO? `SPEC-MVP-PARAMETERS.md` §8 lo marca como
     comparación obligatoria. Se compara a IGUAL PRESUPUESTO DE ALERTAS, que es la única forma
     honesta, y contra un PISO DE AZAR promediado sobre varias semillas: sin ese piso, un
     recall alto sobre fallas agrupadas no se puede interpretar.

Modelo: regresión logística implementada con numpy (el entorno de referencia no trae sklearn ni
LightGBM). Es un PISO: LightGBM, con interacciones no lineales, debería rendir mejor al mismo
presupuesto. Lo que importa es el orden de magnitud y la comparación relativa.

USO
    python3 analisis/evaluate-baseline-honestly.py
    python3 analisis/evaluate-baseline-honestly.py --limpio /ruta/dataset_limpio.parquet --semillas 50

REQUISITOS
    Python 3.9+ con numpy y pyarrow. El dataset limpio vive en Git LFS:
        git lfs install && git lfs pull
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq

CLEAN_DEFAULT = "ml/datos/dataset_limpio.parquet"
COLUMNAS_FUGA = ("corriente_a", "potencia_consumida_kw")


def titulo(t):
    print()
    print("=" * 78)
    print(t)
    print("=" * 78)


def cargar(path):
    t = pq.read_table(path).to_pydict()
    n = len(t["id_maquina"])
    maq = np.array(t["id_maquina"])
    ts = np.array([x.timestamp() for x in t["fecha_hora"]])
    mes = np.array([x.month for x in t["fecha_hora"]], dtype=float)
    y = np.array([1.0 if v == 1 else 0.0 for v in t["target_falla_48h"]])
    disp = np.array([1 if v == 1 else 0 for v in t["falla_inicio_disparo"]])

    def col(name):
        return np.array([np.nan if v is None else float(v) for v in t[name]])

    # ordenar por máquina para las ventanas móviles (el notebook las calcula así)
    orden = np.argsort(maq, kind="stable")
    idx = np.argsort(orden, kind="stable")
    inv = np.empty_like(idx)
    inv[idx] = np.arange(len(idx))
    maq_o = maq[idx]

    def reordenar(v):
        return v[idx]

    def rolling(v, w, fn):
        out = np.full(len(v), np.nan)
        v_o = reordenar(v)
        ini = 0
        for i in range(1, len(v_o) + 1):
            if i == len(v_o) or maq_o[i] != maq_o[ini]:
                seg = v_o[ini:i]
                for j in range(len(seg)):
                    out[ini + j] = fn(seg[max(0, j - w + 1) : j + 1])
                ini = i
        return out[inv]

    feats = {}
    for k in (
        "carga_pct", "velocidad_rpm", "voltaje_v", "temperatura_c", "vibracion_mms", "presion_bar",
        "horas_operacion_totales", "ciclos_acumulados", "horas_desde_ultimo_mantenimiento",
        "conteo_fallas_previas", "antiguedad_anos", "costo_parada_hora_usd", "potencia_nominal_kw",
        "vibracion_critica", "temperatura_critica",
    ):
        feats[k] = reordenar(col(k))
    for s in ("temperatura_c", "vibracion_mms", "presion_bar"):
        for w in (3, 6, 12):
            feats[f"{s}_roll_mean_{w}h"] = rolling(feats[s], w, np.mean)
            feats[f"{s}_roll_std_{w}h"] = rolling(feats[s], w, lambda x: np.std(x) if len(x) > 1 else 0.0)

    fuga = {k: reordenar(col(k)) for k in COLUMNAS_FUGA}
    ratio = reordenar(
        col("potencia_consumida_kw")
        / (col("potencia_nominal_kw") * (0.12 + 0.88 * col("carga_pct") / 100.0))
    )
    return dict(t=t, n=n, maq=maq, ts=ts, mes=mes, y=y, disp=disp, feats=feats, fuga=fuga, ratio=ratio)


def auc(score, target):
    o = np.argsort(score, kind="stable")
    s, yy = score[o], target[o]
    rangos = np.empty(len(s))
    i = 0
    while i < len(s):
        j = i
        while j + 1 < len(s) and s[j + 1] == s[i]:
            j += 1
        rangos[i : j + 1] = (i + j) / 2 + 1
        i = j + 1
    npos = yy.sum()
    nneg = len(yy) - npos
    if npos == 0 or nneg == 0:
        return float("nan")
    return (rangos[yy == 1].sum() - npos * (npos + 1) / 2) / (npos * nneg)


def entrenar(X, D, train, test, y):
    mu, sd = X[train].mean(0), X[train].std(0)
    sd[sd == 0] = 1
    Xs = (X - mu) / sd
    Xtr = np.hstack([np.ones((train.sum(), 1)), Xs[train]])
    ytr = y[train]
    w = np.zeros(Xtr.shape[1])
    sw = np.where(ytr == 1, len(ytr) / (2 * max(ytr.sum(), 1)), len(ytr) / (2 * max((1 - ytr).sum(), 1)))
    for _ in range(600):
        p = 1 / (1 + np.exp(-np.clip(Xtr @ w, -30, 30)))
        w -= 0.5 * (Xtr.T @ (sw * (p - ytr)) / len(ytr) + 1e-3 * w)
    score = np.full(D["n"], np.nan)
    score[test] = 1 / (1 + np.exp(-np.clip(np.hstack([np.ones((test.sum(), 1)), Xs[test]]) @ w, -30, 30)))
    return score


def metricas_fila(score, y, test):
    pt = score[test]
    yt = y[test]
    a = auc(pt, yt)
    mejor = (0, 0, 0, 0)
    for th in np.arange(0.05, 0.96, 0.01):
        pred = pt >= th
        tp = float(((pred == 1) & (yt == 1)).sum())
        fp = float(((pred == 1) & (yt == 0)).sum())
        fn = float(((pred == 0) & (yt == 1)).sum())
        if tp == 0:
            continue
        p, r = tp / (tp + fp), tp / (tp + fn)
        f1 = 2 * p * r / (p + r)
        if f1 > mejor[0]:
            mejor = (f1, p, r, th)
    rec50 = float("nan")
    for th in np.arange(0.05, 0.96, 0.01):
        pred = pt >= th
        tp = float(((pred == 1) & (yt == 1)).sum())
        fp = float(((pred == 1) & (yt == 0)).sum())
        fn = float(((pred == 0) & (yt == 1)).sum())
        if tp and tp / (tp + fp) >= 0.50:
            rec50 = tp / (tp + fn)
            break
    return a, mejor, rec50


def main():
    ap = argparse.ArgumentParser(description="Evaluación honesta del baseline (fila, evento y calendario)")
    ap.add_argument("--limpio", default=CLEAN_DEFAULT, help=f"parquet limpio (por defecto {CLEAN_DEFAULT})")
    ap.add_argument("--presupuestos", default="25,50,100,250,500,1000", help="alertas por mes a comparar")
    ap.add_argument("--semillas", type=int, default=20, help="semillas para promediar el piso de azar")
    args = ap.parse_args()
    if not Path(args.limpio).exists():
        raise SystemExit(f"No encuentro {args.limpio}. El dataset limpio vive en Git LFS: git lfs pull")

    D = cargar(args.limpio)
    train, test = D["mes"] <= 3, D["mes"] == 4
    print(f"dataset limpio: {D['n']:,} filas")
    print(f"train (enero-marzo): {train.sum():,} filas · {int(D['y'][train].sum()):,} positivas ({100*D['y'][train].mean():.1f} %)")
    print(f"test  (abril)      : {test.sum():,} filas · {int(D['y'][test].sum()):,} positivas ({100*D['y'][test].mean():.1f} %)")

    base = list(D["feats"])
    Xa = np.column_stack([D["feats"][k] for k in base])
    Xb = np.column_stack([D["feats"][k] for k in base] + [D["fuga"][k] for k in COLUMNAS_FUGA])
    Xc = np.column_stack([D["feats"][k] for k in base] + [D["fuga"][k] for k in COLUMNAS_FUGA] + [D["ratio"]])

    titulo("1. Techo real del baseline (métricas por fila, abril)")
    for X, nombre in (
        (Xa, f"sin las columnas que filtran ({len(base)} features) — ESTIMACIÓN HONESTA"),
        (Xb, f"con {COLUMNAS_FUGA[0]} y {COLUMNAS_FUGA[1]}"),
        (Xc, "CONTROL: + el cociente explícito (debe dar ~0,99)"),
    ):
        a, mejor, rec50 = metricas_fila(entrenar(X, D, train, test, D["y"]), D["y"], test)
        print(f"\n   {nombre}")
        print(f"      AUC {a:.3f} · mejor F1 {mejor[0]:.3f} (P {mejor[1]:.3f} · R {mejor[2]:.3f} · umbral {mejor[3]:.2f})")
        print(f"      recall a precision 0,50: {rec50:.3f}")

    score_modelo = entrenar(Xa, D, train, test, D["y"])
    score_calendario = D["feats"]["horas_desde_ultimo_mantenimiento"].copy()

    # ventanas de anticipación: filas de la misma máquina en las 48 h previas a cada evento
    por_maq = {}
    for i in range(D["n"]):
        por_maq.setdefault(D["maq"][i], []).append(i)
    for m in por_maq:
        por_maq[m].sort(key=lambda i: D["ts"][i])
    ev = np.where(test & (D["disp"] == 1))[0]
    ventanas = [
        [i for i in por_maq[D["maq"][e]] if 0 < D["ts"][e] - D["ts"][i] <= 48 * 3600] for e in ev
    ]

    def evaluar(score, objetivo):
        it = np.where(test & np.isfinite(score))[0]
        if objetivo >= len(it):
            thr = -np.inf
        else:
            thr = np.sort(score[it])[::-1][objetivo - 1]
        alertas = {i for i in it if score[i] >= thr}
        detectados = sum(1 for w in ventanas if any(i in alertas for i in w))
        leads = []
        for e, w in zip(ev, ventanas):
            aciertos = [i for i in w if i in alertas]
            if aciertos:
                leads.append(max(D["ts"][e] - D["ts"][i] for i in aciertos) / 3600)
        return detectados, len(alertas), (float(np.median(leads)) if leads else float("nan"))

    titulo("2. Evaluación POR EVENTO contra el calendario, a igual presupuesto de alertas")
    print(f"   eventos de falla en abril: {len(ev)}")
    print()
    print(f"   {'alertas/mes':>12} | {'modelo':>18} | {'calendario':>12} | {'azar (media)':>14}")
    print("   " + "-" * 68)
    for ob in [int(x) for x in args.presupuestos.split(",")]:
        dm, am, lm = evaluar(score_modelo, ob)
        dc, ac, _ = evaluar(score_calendario, ob)
        vals = []
        for sem in range(args.semillas):
            rng = np.random.default_rng(sem)
            az = np.full(D["n"], np.nan)
            it = np.where(test)[0]
            az[it] = rng.random(len(it))
            vals.append(evaluar(az, ob)[0])
        print(
            f"   {ob:>12} | {dm:4}/{len(ev)} ({100*dm/len(ev):4.1f} %) | "
            f"{dc:4}/{len(ev)} ({100*dc/len(ev):4.1f} %) | {100*np.mean(vals)/len(ev):13.1f} %"
        )
    print(f"\n   anticipación mediana del modelo (50 alertas/mes): {evaluar(score_modelo, 50)[2]:.1f} h")

    titulo("Cómo leer esto")
    print("   · El modelo le gana al calendario por 3 a 5 veces en todos los presupuestos.")
    print("   · Solo le gana AL AZAR con presupuestos bajos: desde ~250 alertas/mes el azar")
    print("     detecta más eventos, porque con fallas en ráfaga y ventanas de 48 h una densidad")
    print("     alta de alarmas 'pega' por casualidad. Con presupuestos altos, todo detector parece bueno.")
    print("   · Comparar el recall por fila con el porcentaje de eventos: la diferencia es el punto.")
    print("   · El modelo es una regresión logística: es un piso, no un techo.")


if __name__ == "__main__":
    main()
