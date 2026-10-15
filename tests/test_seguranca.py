"""
Testes de segurança "como um estranho": cada teste tenta um ataque e confere que o site resiste.
Rode junto com os outros: pytest tests/
"""
import pytest


# ---- 2 e 8: arquivos sensíveis nunca são servidos (.env, banco, código, chave da sessão)
@pytest.mark.parametrize("caminho", [
    "/.env", "/app.py", "/banco/patasperto.db", "/banco/.chave_secreta",
    "/static/../app.py", "/static/..%2fapp.py", "/static/../banco/patasperto.db", "/static/%2e%2e/banco/.chave_secreta",
])
def test_arquivos_sensiveis_nao_sao_servidos(cliente, caminho):
    r = cliente.get(caminho)
    assert r.status_code == 404
    assert b"secret" not in r.data and b"SQLite" not in r.data and b"import" not in r.data


# ---- 3: a chave da sessão não está no código
def test_chave_da_sessao_nao_e_a_padrao_antiga():
    from app import app
    assert app.secret_key and app.secret_key != "patasperto-demo-nao-usar-em-producao"
    assert len(app.secret_key) >= 32


# ---- 5, 6 e 7: sem login, ninguém lê ou grava dados de outro tutor só trocando o id
@pytest.mark.parametrize("metodo, caminho, corpo", [
    ("get", "/api/tutores/2", None),
    ("get", "/api/tutores/2/historico", None),
    ("get", "/api/pedidos?tutor_id=2", None),
    ("post", "/api/compras", {"tutor_id": 2, "oferta_id": 1}),
    ("post", "/api/pedidos", {"tutor_id": 2, "itens": [{"oferta_id": 1}], "entrega": "retirada", "pagamento": "pix"}),
    ("post", "/api/recomendar", {"tutor_id": 2}),
])
def test_nao_confia_no_id_enviado_pela_tela(cliente, metodo, caminho, corpo):
    r = getattr(cliente, metodo)(caminho, json=corpo)
    assert r.status_code in (401, 403)


def test_cliente_logado_so_ve_o_proprio_tutor(cliente):
    cliente.post("/api/login", json={"email": "ana.ribeiro@exemplo.com", "senha": "demo123"})   # tutor 1
    assert cliente.get("/api/tutores/2").status_code == 403
    # mesmo pedindo o tutor 2, a compra cai no tutor da conta logada
    antes = cliente.get("/api/tutores/1/historico").get_json()["total_compras_janela"]
    assert cliente.post("/api/compras", json={"tutor_id": 2, "oferta_id": 1}).status_code == 201
    assert cliente.get("/api/tutores/1/historico").get_json()["total_compras_janela"] == antes + 1


def test_rotas_restritas_exigem_o_tipo_certo_de_conta(cliente):
    assert cliente.put("/api/perfil", json={}).status_code == 401
    assert cliente.get("/api/clinica/painel").status_code == 401
    cliente.post("/api/login", json={"email": "ana.ribeiro@exemplo.com", "senha": "demo123"})
    assert cliente.get("/api/clinica/painel").status_code == 403          # cliente não vê o painel da clínica


def test_resposta_nunca_traz_hash_de_senha_nem_cpf_de_outros(cliente):
    r = cliente.post("/api/login", json={"email": "ana.ribeiro@exemplo.com", "senha": "demo123"})
    assert "senha_hash" not in r.get_data(as_text=True)
    assert "cpf" not in cliente.get("/api/tutores/1").get_json()


# ---- 12: erro sem detalhe interno
def test_erros_nao_vazam_detalhes(cliente):
    for r in (cliente.get("/api/nao-existe"), cliente.post("/api/compras", json={"oferta_id": "abc"}),
              cliente.delete("/api/ofertas")):
        texto = r.get_data(as_text=True)
        assert r.is_json and "erro" in r.get_json()
        assert "Traceback" not in texto and "invalid literal" not in texto and ".py" not in texto


# ---- 13 e 14: o servidor valida tudo, mesmo o que a tela já valida
@pytest.mark.parametrize("caminho, corpo", [
    ("/api/compras", {"oferta_id": 1, "quantidade": -5}),        # quantidade negativa = valor negativo na IA
    ("/api/compras", {"oferta_id": 1, "quantidade": 10_000}),
    ("/api/recomendar", {"situacao": "<script>alert(1)</script>"}),
    ("/api/recomendar", {"hora": "<img src=x onerror=alert(1)>"}),
    ("/api/recomendar", {"idade_anos": "nan"}),
    ("/api/recomendar", {"idade_anos": 999}),
])
def test_valida_entrada_no_servidor(cliente, caminho, corpo):
    assert cliente.post(caminho, json={"tutor_id": 1} | corpo).status_code == 400


def test_valida_filtros_das_clinicas(cliente):
    assert cliente.get("/api/clinicas?hora=99:99").status_code == 400
    assert cliente.get("/api/clinicas?especialidade=<b>x</b>").status_code == 400
    assert cliente.get("/api/geocodificar?q=" + "a" * 500).status_code == 400


def test_corpo_gigante_e_recusado(cliente):
    r = cliente.post("/api/login", data="x" * 200_000, content_type="application/json")
    assert r.status_code == 413


def test_site_javascript_do_openstreetmap_e_descartado():
    import clinicas_osm
    for site, esperado in [("javascript:alert(1)", ""), (" JavaScript:alert(1)", ""), ("data:text/html,x", ""),
                           ("https://vet.example", "https://vet.example"), ("http://vet.example", "http://vet.example")]:
        assert clinicas_osm._link_seguro(site) == esperado


# ---- 16: injeção de SQL não funciona (as consultas usam parâmetros "?")
@pytest.mark.parametrize("email", ["' OR '1'='1", "ana.ribeiro@exemplo.com' --", "\" OR 1=1 --"])
def test_injecao_de_sql_no_login(cliente, email):
    assert cliente.post("/api/login", json={"email": email, "senha": "x' OR '1'='1"}).status_code == 401


# ---- 17: limite de tentativas
def test_limite_de_tentativas_no_login(cliente):
    errado = {"email": "ana.ribeiro@exemplo.com", "senha": "errada"}
    for _ in range(5):
        assert cliente.post("/api/login", json=errado).status_code == 401
    r = cliente.post("/api/login", json=errado)
    assert r.status_code == 429 and r.headers["Retry-After"]
    # bloqueado, nem a senha certa entra até a janela passar
    assert cliente.post("/api/login", json=errado | {"senha": "demo123"}).status_code == 429


def test_limite_de_tentativas_no_cadastro(cliente):
    codigos = [cliente.post("/api/cadastro", json={"tipo": "x"}).status_code for _ in range(11)]
    assert codigos[:10] == [400] * 10 and codigos[10] == 429


# ---- 19: cabeçalhos de segurança e CORS
def test_cabecalhos_de_seguranca(cliente):
    for r in (cliente.get("/"), cliente.get("/api/ofertas")):
        h = r.headers
        assert "script-src 'self'" in h["Content-Security-Policy"] and "frame-ancestors 'none'" in h["Content-Security-Policy"]
        assert h["X-Content-Type-Options"] == "nosniff" and h["X-Frame-Options"] == "DENY"
        assert h["Referrer-Policy"] and h["Permissions-Policy"]
    assert cliente.get("/api/sessao").headers["Cache-Control"] == "no-store"


def test_outro_site_nao_le_a_api(cliente):
    r = cliente.get("/api/ofertas", headers={"Origin": "https://site-malicioso.example"})
    assert "Access-Control-Allow-Origin" not in r.headers


def test_cookie_de_sessao_protegido(cliente):
    r = cliente.post("/api/login", json={"email": "ana.ribeiro@exemplo.com", "senha": "demo123"})
    cookie = r.headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "SameSite=Lax" in cookie
