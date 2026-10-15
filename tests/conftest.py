"""Fixtures compartilhadas pelos testes (o pytest carrega este arquivo sozinho)."""
import os
import shutil
import sys

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ)

import app as modulo_app  # noqa: E402
from app import app  # noqa: E402


@pytest.fixture
def cliente():
    app.config["TESTING"] = True
    return app.test_client()


@pytest.fixture(autouse=True)
def banco_temp(tmp_path, monkeypatch):
    """Cópia do banco para CADA teste: compras e cadastros dos testes nunca ficam no banco do app
    (antes, compras acumuladas no tutor demo mudavam a resposta da IA e quebravam test_recomendar_emergencia)."""
    import consultas
    copia = tmp_path / "patasperto.db"
    shutil.copy(consultas.CAMINHO_DB, copia)
    monkeypatch.setattr(consultas, "CAMINHO_DB", str(copia))
    return str(copia)


@pytest.fixture(autouse=True)
def zera_limite_de_tentativas():
    """O limite de tentativas fica na memória do app: cada teste começa do zero."""
    modulo_app._tentativas.clear()
    yield
    modulo_app._tentativas.clear()
