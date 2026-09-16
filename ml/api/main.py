from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import pandas as pd
import joblib
import os

app = FastAPI(title="Servidor de Inferencia Automático - Mantenimiento Predictivo", version="2.0")

# Carga segura del modelo .pkl
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "modelo_predictivo_lightgbm.joblib")
model = joblib.load(MODEL_PATH)

# 1. ESQUEMA SIMPLIFICADO: Lo que el backend SÍ conoce (Una sola lectura por hora)
class LecturaSensor(BaseModel):
    carga_pct: float
    voltaje_v: float
    corriente_a: float
    potencia_consumida_kw: float
    temperatura_c: float
    vibracion_mms: float
    presion_bar: float
    vibracion_critica: int
    temperatura_critica: int
    mes: int
    dia_semana: str

# El backend nos enviará los datos fijos de la máquina + un historial de las últimas 12 horas de sensores
class TelemetriaPayloadSimplificado(BaseModel):
    id_maquina: str
    tipo_equipo: str
    modelo: str
    linea_produccion: str
    antiguedad_anos: int
    criticidad: str
    costo_parada_hora_usd: int
    potencia_nominal_kw: float
    marca: str
    horas_operacion_totales: int
    ciclos_acumulados: int
    horas_desde_ultimo_mantenimiento: int
    conteo_fallas_previas: int
    
    # Lista con las últimas 12 horas de telemetría ordenada en el tiempo
    historial_sensores_12h: List[LecturaSensor]

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": "LightGBM_Calculo_Nativo_v2.0"}

@app.post("/api/v1/predict/falla")
def predict_falla(payload: TelemetriaPayloadSimplificado):
    # A. Convertimos el historial enviado por el backend a un DataFrame de Pandas
    historial_dicts = [lectura.dict() for lectura in payload.historial_sensores_12h]
    df_history = pd.DataFrame(historial_dicts)
    
    # B. TU API CALCULA EL FEATURE ENGINEERING EN MICROSEGUNDOS
    # Ventanas de 3 horas
    df_history['temperatura_c_roll_mean_3h'] = df_history['temperatura_c'].rolling(3).mean()
    df_history['vibracion_mms_roll_mean_3h'] = df_history['vibracion_mms'].rolling(3).mean()
    df_history['presion_bar_roll_mean_3h'] = df_history['presion_bar'].rolling(3).mean()
    df_history['temperatura_c_roll_std_3h'] = df_history['temperatura_c'].rolling(3).std()
    df_history['vibracion_mms_roll_std_3h'] = df_history['vibracion_mms'].rolling(3).std()
    df_history['presion_bar_roll_std_3h'] = df_history['presion_bar'].rolling(3).std()
    
    # Ventanas de 6 horas
    df_history['temperatura_c_roll_mean_6h'] = df_history['temperatura_c'].rolling(6).mean()
    df_history['vibracion_mms_roll_mean_6h'] = df_history['vibracion_mms'].rolling(6).mean()
    df_history['presion_bar_roll_mean_6h'] = df_history['presion_bar'].rolling(6).mean()
    df_history['temperatura_c_roll_std_6h'] = df_history['temperatura_c'].rolling(6).std()
    df_history['vibracion_mms_roll_std_6h'] = df_history['vibracion_mms'].rolling(6).std()
    df_history['presion_bar_roll_std_6h'] = df_history['presion_bar'].rolling(6).std()
    
    # Ventanas de 12 horas
    df_history['temperatura_c_roll_mean_12h'] = df_history['temperatura_c'].rolling(12).mean()
    df_history['vibracion_mms_roll_mean_12h'] = df_history['vibracion_mms'].rolling(12).mean()
    df_history['presion_bar_roll_mean_12h'] = df_history['presion_bar'].rolling(12).mean()
    df_history['temperatura_c_roll_std_12h'] = df_history['temperatura_c'].rolling(12).std()
    df_history['vibracion_mms_roll_std_12h'] = df_history['vibracion_mms'].rolling(12).std()
    df_history['presion_bar_roll_std_12h'] = df_history['presion_bar'].rolling(12).std()
    
    # C. Tomamos solo la última fila (la hora actual)
    fila_actual = df_history.iloc[[-1]].copy()
    
    # D. Agregamos los datos administrativos fijos de la máquina
    fila_actual['id_maquina'] = payload.id_maquina
    fila_actual['tipo_equipo'] = payload.tipo_equipo
    fila_actual['modelo'] = payload.modelo
    fila_actual['linea_produccion'] = payload.linea_produccion
    fila_actual['antiguedad_anos'] = payload.antiguedad_anos
    fila_actual['criticidad'] = payload.criticidad
    fila_actual['costo_parada_hora_usd'] = payload.costo_parada_hora_usd
    fila_actual['potencia_nominal_kw'] = payload.potencia_nominal_kw
    fila_actual['marca'] = payload.marca
    fila_actual['horas_operacion_totales'] = payload.horas_operacion_totales
    fila_actual['ciclos_acumulados'] = payload.ciclos_acumulados
    fila_actual['horas_desde_ultimo_mantenimiento'] = payload.horas_desde_ultimo_mantenimiento
    fila_actual['conteo_fallas_previas'] = payload.conteo_fallas_previas
    
    # E. ALINEACIÓN PRECISA CON TU IMPRESIÓN DE X_TRAIN (42 Columnas)
    columnas_modelo = [
        'id_maquina', 'tipo_equipo', 'modelo', 'linea_produccion', 'antiguedad_anos', 'criticidad',
        'costo_parada_hora_usd', 'potencia_nominal_kw', 'marca', 'horas_operacion_totales', 'ciclos_acumulados',
        'horas_desde_ultimo_mantenimiento', 'conteo_fallas_previas', 'carga_pct', 'voltaje_v', 'corriente_a',
        'potencia_consumida_kw', 'temperatura_c', 'vibracion_mms', 'presion_bar', 'vibracion_critica',
        'temperatura_critica', 'mes', 'dia_semana', 'temperatura_c_roll_mean_3h', 'vibracion_mms_roll_mean_3h',
        'presion_bar_roll_mean_3h', 'temperatura_c_roll_std_3h', 'vibracion_mms_roll_std_3h', 'presion_bar_roll_std_3h',
        'temperatura_c_roll_mean_6h', 'vibracion_mms_roll_mean_6h', 'presion_bar_roll_mean_6h', 'temperatura_c_roll_std_6h',
        'vibracion_mms_roll_std_6h', 'presion_bar_roll_std_6h', 'temperatura_c_roll_mean_12h',
        'vibracion_mms_roll_mean_12h', 'presion_bar_roll_mean_12h', 'temperatura_c_roll_std_12h',
        'vibracion_mms_roll_std_12h', 'presion_bar_roll_std_12h'
    ]
    
    # Reindexamos de forma estricta para garantizar el orden matemático exacto
    df_inferencia = fila_actual.reindex(columns=columnas_modelo).fillna(0)
    
    # Convertimos los formatos categóricos obligatorios
    columnas_categoricas = ['id_maquina', 'tipo_equipo', 'modelo', 'linea_produccion', 'criticidad', 'marca', 'dia_semana']
    for col in columnas_categoricas:
        df_inferencia[col] = df_inferencia[col].astype('category')
        
    # F. Inferencia matemática
    prediccion_binaria = int(model.predict(df_inferencia)[0])
    probabilidad_falla = float(model.predict_proba(df_inferencia)[0][1])
    
    return {
        "id_maquina": payload.id_maquina,
        "falla_predicha_48h": prediccion_binaria,
        "probabilidad_falla": round(probabilidad_falla, 4),
        "score_dashboard": int(probabilidad_falla * 100),
        "alerta_estado": "Riesgo crítico" if prediccion_binaria == 1 else "Operación normal",
        "color_hex": "#e74c3c" if prediccion_binaria == 1 else "#2ecc71"
    }
