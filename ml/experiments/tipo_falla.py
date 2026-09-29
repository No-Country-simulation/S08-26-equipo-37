"""Experimento: segundo target (tipo de falla) sobre el dataset actual.

Se corre desde cualquier directorio:  python ml/experiments/tipo_falla.py

Pregunta: ¿el tipo de falla inminente se puede predecir desde la telemetría?
Misma matriz de 40 features y misma partición temporal que el modelo binario.

Se mide dos veces: con la matriz completa y sin las dos banderas derivadas del
tipo (`temperatura_critica`, `vibracion_critica`), para separar la firma física
real del atajo que codifica el generador.
"""
import json
import pathlib
import warnings

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score

warnings.filterwarnings("ignore")

DATA = pathlib.Path(__file__).resolve().parents[1] / "datos" / "dataset_limpio.parquet"
CORTE = "2026-03-31 23:00:00"
TARGET = "target_tipo_falla"
BINARIO = "target_falla_48h"
BANDERAS = ["temperatura_critica", "vibracion_critica"]
out = []


def log(m=""):
    print(m, flush=True)
    out.append(str(m))


df = pd.read_parquet(DATA).sort_values(["id_maquina", "fecha_hora"]).reset_index(drop=True)
for w in (3, 6, 12):
    roll = df.groupby("id_maquina")[["temperatura_c", "vibracion_mms", "presion_bar"]].rolling(w, min_periods=1)
    df = pd.concat([df,
                    roll.mean().reset_index(level=0, drop=True).rename(columns=lambda c: f"{c}_roll_mean_{w}h"),
                    roll.std().reset_index(level=0, drop=True).rename(columns=lambda c: f"{c}_roll_std_{w}h")], axis=1)
for c in [c for c in df.columns if "_std_" in c]:
    df[c] = df[c].fillna(0)

# Matriz del modelo binario: 40 features (sin las derivadas del target).
EXC = ["velocidad_rpm", "target_tipo_falla", "target_rul_horas", "target_estado_salud",
       "falla_inicio_disparo", "falla_estado_causa", "codigo_alarma_plc", "estado_operativo",
       "corriente_a", "potencia_consumida_kw", BINARIO, TARGET, "fecha_hora"]
FEATURES = [c for c in df.columns if c not in EXC]
log(f"features ({len(FEATURES)}): igual que el modelo binario")

# Universo: solo filas dentro de la ventana de 48 h (donde el tipo está definido).
pos = df[df[BINARIO] == 1].copy()

def eventos(frame):
    """Cada arranque de ventana (0 -> 1) es un evento de falla, con su tipo."""
    filas = []
    for maquina, g in frame.sort_values("fecha_hora").groupby("id_maquina"):
        nuevo = (g[BINARIO].shift(1).fillna(0) == 0) & (g[BINARIO] == 1)
        for _, r in g[nuevo].iterrows():
            filas.append({"id_maquina": maquina, "fecha_hora": r["fecha_hora"], "tipo": r[TARGET]})
    return pd.DataFrame(filas)

ev = eventos(df)
log(f"filas en la ventana de 48 h: {len(pos)} | eventos de falla en el dataset: {len(ev)}")
log("eventos por tipo:")
for k, v in ev.tipo.value_counts().items():
    log(f"  {k:22s} {v:4d}")
log("\ndistribución por tipo (filas):")
for k, v in pos[TARGET].value_counts().items():
    log(f"  {k:22s} {v:5d}")

tr, te = pos[pos["fecha_hora"] <= CORTE], pos[pos["fecha_hora"] > CORTE]
log(f"\npartición temporal: train <= {CORTE} ({len(tr)} filas) | test > ({len(te)} filas)")
log("soporte por clase en el test:")
for k, v in te[TARGET].value_counts().items():
    log(f"  {k:22s} {v:5d}")
ev_test = ev[ev.fecha_hora > CORTE]
log(f"eventos en el test: {len(ev_test)}")
for k, v in ev_test.tipo.value_counts().items():
    log(f"  {k:22s} {v:4d}")
base = te[TARGET].value_counts(normalize=True).max()
log(f"clase mayoritaria en el test: {base:.4f}")


def correr(cols, etiqueta):
    Xtr, ytr = tr[cols], tr[TARGET]
    Xte, yte = te[cols], te[TARGET]
    m = lgb.LGBMClassifier(objective="multiclass", num_class=3, learning_rate=0.05, num_leaves=31,
                           max_depth=-1, random_state=42, verbose=-1)
    m.fit(Xtr, ytr)
    pred = m.predict(Xte)
    rep = classification_report(yte, pred, output_dict=True, zero_division=0)
    log(f"\n=== {etiqueta} ({len(cols)} features) ===")
    log(f"  exactitud: {accuracy_score(yte, pred):.4f} | macro-F1: {f1_score(yte, pred, average='macro'):.4f}")
    for clase in sorted(yte.unique()):
        r = rep.get(clase, {})
        log(f"  {clase:22s} precision={r.get('precision', 0):.3f} recall={r.get('recall', 0):.3f} f1={r.get('f1-score', 0):.3f}")
    log("  matriz de confusión (filas = real, columnas = predicho):")
    log("    " + " | ".join(f"{c[:12]:>12s}" for c in sorted(yte.unique())))
    for i, clase in enumerate(sorted(yte.unique())):
        log(f"    {clase[:18]:22s}" + " | ".join(f"{v:12d}" for v in confusion_matrix(yte, pred, labels=sorted(yte.unique()))[i]))
    return {"exactitud": round(float(accuracy_score(yte, pred)), 4),
            "macro_f1": round(float(f1_score(yte, pred, average="macro")), 4),
            "por_clase": {c: {"precision": round(rep[c]["precision"], 3), "recall": round(rep[c]["recall"], 3),
                              "soporte": int(rep[c]["support"])} for c in sorted(yte.unique())}}


log("\n" + "=" * 70)
res = {}
res["completa"] = correr(FEATURES, "Matriz completa")
res["sin_banderas"] = correr([c for c in FEATURES if c not in BANDERAS], "Sin las banderas derivadas del tipo")

# ¿Cuánto aporta cada bandera por sí sola?
log("\n=== Atajo: ¿cuánto explica `temperatura_critica` sola? ===")
log(f"  exactitud prediciendo Motor_Termico con temperatura_critica==1: "
    f"{float((te['temperatura_critica'] == (te[TARGET] == 'Fallo_Motor_Termico').astype(int)).mean()):.4f}")
log(f"  filas de Motor_Termico con temperatura_critica==1 en el test: "
    f"{int(((te[TARGET] == 'Fallo_Motor_Termico') & (te['temperatura_critica'] == 1)).sum())} "
    f"de {int((te[TARGET] == 'Fallo_Motor_Termico').sum())}")

res["clase_mayoritaria"] = round(float(base), 4)
res["filas_test"] = int(len(te))
res["eventos_dataset"] = int(len(ev))
res["eventos_test"] = int(len(ev_test))
res["eventos_test_por_tipo"] = {k: int(v) for k, v in ev_test.tipo.value_counts().items()}
SALIDA = pathlib.Path(__file__).resolve().parent / "resultados_tipo_falla.json"
json.dump(res, open(SALIDA, "w"), indent=2, ensure_ascii=False)
log(f"\n[ok] {SALIDA}")
