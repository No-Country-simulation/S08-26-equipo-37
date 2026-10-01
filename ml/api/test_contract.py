"""Contract tests for the inference API and the model artifact.

These run in CI on every change. They exist because a review found the endpoint
answering `200` while the input columns were in the wrong order: the model was
serving predictions of the wrong row (9.7% of the decisions were inverted), and
nothing in the repository could catch it — the notebook only exercised the model
in-process, never through `columnas_modelo` or through the request schema.
"""

import pathlib
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import main as api  # noqa: E402

# Columns the dataset generator derives from the target: while any of them is a
# feature, no metric of this model measures predictive capability.
TARGET_DERIVED_FEATURES = ("potencia_consumida_kw", "corriente_a")


@pytest.fixture(scope="module")
def client():
    return TestClient(api.app)


def payload(rows=12):
    """A payload shaped like the one documented in `ml/README.md`."""
    sensor = {
        "carga_pct": 82.5,
        "voltaje_v": 400.0,
        "temperatura_c": 86.5,
        "vibracion_mms": 14.2,
        "presion_bar": 4.2,
        "vibracion_critica": 0,
        "temperatura_critica": 1,
        "mes": 4,
        "dia_semana": "Monday",
    }
    return {
        "id_maquina": "M-01",
        "tipo_equipo": "Torno CNC",
        "modelo": "CNC-Principal",
        "linea_produccion": "Mecanizado_Pesado",
        "antiguedad_anos": 5,
        "criticidad": "Alta",
        "costo_parada_hora_usd": 1500,
        "potencia_nominal_kw": 45.0,
        "marca": "BrandX",
        "horas_operacion_totales": 12450,
        "ciclos_acumulados": 8500,
        "horas_desde_ultimo_mantenimiento": 120,
        "conteo_fallas_previas": 2,
        "historial_sensores_12h": [dict(sensor) for _ in range(rows)],
    }


def test_api_columns_follow_the_model_order():
    assert api.columnas_modelo == list(api.model.feature_name_)


def test_model_does_not_use_target_derived_features():
    features = set(api.model.feature_name_)
    assert not features.intersection(TARGET_DERIVED_FEATURES)


def test_model_is_a_binary_classifier(client):
    response = client.post("/api/v1/predict/falla", json=payload())
    assert response.status_code == 200
    body = response.json()
    assert body["id_maquina"] == "M-01"
    assert body["falla_predicha_48h"] in (0, 1)
    assert 0.0 <= body["probabilidad_falla"] <= 1.0


def test_documented_payload_is_accepted(client):
    """`ml/README.md` documents a payload without the electrical columns; it must work."""
    response = client.post("/api/v1/predict/falla", json=payload())
    assert response.status_code == 200, response.text


def test_payload_missing_a_required_sensor_is_rejected(client):
    incomplete = payload()
    del incomplete["historial_sensores_12h"][0]["presion_bar"]
    response = client.post("/api/v1/predict/falla", json=incomplete)
    assert response.status_code == 422


def test_health_reports_the_model_loaded(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
