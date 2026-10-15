"""
PatasPerto — back-end (API Flask).

Uso:  python app.py   →  http://127.0.0.1:5000

Camadas:
  static/            front-end (HTML/CSS/JS) servido por esta mesma app (mesma origem, sem CORS)
  banco/consultas.py acesso ao SQLite      → rotas marcadas [banco]
  ml/recomendador.py modelo Random Forest  → rotas marcadas [IA]

Contas (login de DEMONSTRAÇÃO, dados fictícios): 'cliente' (tutor + pet) e 'clinica'.
Senhas só como hash (werkzeug.security); sessão via flask.session. A conta clínica acessa
o painel de indicadores — agregação SQL (GROUP BY), não IA.
"""
import math
import os
import re
import secrets
import sqlite3
import sys
import time
from collections import defaultdict, deque
from datetime import datetime
from functools import wraps

from flask import Flask, g, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "banco"))
sys.path.insert(0, os.path.join(AQUI, "ml"))

import clinicas_osm  # noqa: E402
import consultas  # noqa: E402
import recomendador  # noqa: E402
from gerar_dataset import SITUACOES  # noqa: E402  (as situações que o modelo conhece)

app = Flask(__name__, static_folder=os.path.join(AQUI, "static"), static_url_path="/static")


def _chave_secreta():
    """
    Chave que assina o cookie de sessão. Quem a conhece consegue forjar um login, então ela
    NUNCA fica no código: vem de PATASPERTO_SECRET_KEY ou de um arquivo local gerado na
    primeira execução (banco/.chave_secreta, fora do Git pelo .gitignore).
    """
    if os.environ.get("PATASPERTO_SECRET_KEY"):
        return os.environ["PATASPERTO_SECRET_KEY"]
    caminho = os.path.join(AQUI, "banco", ".chave_secreta")
    if not os.path.exists(caminho):
        with open(caminho, "w", encoding="utf-8") as f:
            f.write(secrets.token_hex(32))
    with open(caminho, encoding="utf-8") as f:
        return f.read().strip()


app.secret_key = _chave_secreta()
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax",
                  # com HTTPS (site publicado), defina PATASPERTO_HTTPS=1: o cookie só trafega criptografado
                  SESSION_COOKIE_SECURE=os.environ.get("PATASPERTO_HTTPS") == "1",
                  MAX_CONTENT_LENGTH=64 * 1024)   # nenhuma rota recebe arquivo: corpo acima de 64 KB é recusado (413)

# Content-Security-Policy: o navegador só roda scripts, estilos, fontes e imagens desta origem
# (mais os tiles do mapa). Estilos inline ficam liberados porque o app e o Leaflet usam style="...".
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; "
       "img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; "
       "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")


@app.after_request
def cabecalhos_de_seguranca(resp):
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"           # não "adivinha" o tipo do arquivo
    resp.headers["X-Frame-Options"] = "DENY"                     # ninguém embute o site num iframe (clickjacking)
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=(), payment=()"
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"               # dados de conta não ficam em cache
    # CORS: de propósito, nenhum Access-Control-Allow-Origin. Front-end e API têm a mesma origem,
    # então outros sites não conseguem ler as respostas da API.
    return resp


@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(413)
@app.errorhandler(500)
def erro_sem_detalhe(e):
    """Erros da API saem em JSON, sem traceback nem nome de arquivo (o detalhe fica só no log do servidor)."""
    codigo = getattr(e, "code", 500) or 500
    if not request.path.startswith("/api/"):
        return e if codigo != 500 else ("Erro interno.", 500)
    mensagens = {404: "rota não encontrada", 405: "método não permitido", 413: "requisição grande demais"}
    if codigo == 500:
        app.logger.exception("erro interno em %s", request.path)
    return jsonify({"erro": mensagens.get(codigo, "erro interno, tente de novo")}), codigo


# ------------------------------------------------------------ limite de tentativas
# shortcut: guarda as tentativas na memória do processo (zera ao reiniciar e não vale entre vários
# processos). Ao publicar com mais de um processo/servidor, trocar por Redis (ex.: Flask-Limiter).
_tentativas = defaultdict(deque)


def limite_excedido(acao, maximo, janela_s):
    """True se este IP já fez `maximo` tentativas de `acao` nos últimos `janela_s` segundos."""
    agora, fila = time.monotonic(), _tentativas[(acao, request.remote_addr)]
    while fila and agora - fila[0] > janela_s:
        fila.popleft()
    return len(fila) >= maximo


def registrar_tentativa(acao):
    _tentativas[(acao, request.remote_addr)].append(time.monotonic())


def _muitas_tentativas(janela_s):
    resp = jsonify({"erro": "muitas tentativas. Espere alguns minutos e tente de novo."})
    resp.headers["Retry-After"] = str(janela_s)
    return resp, 429

ESPECIES = {"cao", "gato"}
PORTES = {"pequeno", "medio", "grande"}
ESPECIALIDADES = {"clinico_geral", "emergencia", "dermatologia", "odontologia", "ortopedia", "nutricao"}
TUTOR_DEMO_ID = 1   # tutor de demonstração: usado por quem navega sem login (comportamento anterior)


# ------------------------------------------------------------ front-end
@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ------------------------------------------------------------ [banco] loja
@app.get("/api/ofertas")
def api_ofertas():
    return jsonify(consultas.listar_ofertas())


def _posicao(fonte):
    """lat/lon/raio_km vindos da query string ou do corpo JSON; None se ausentes."""
    try:
        lat, lon = float(fonte.get("lat")), float(fonte.get("lon"))
    except (TypeError, ValueError):
        return None
    if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    try:
        raio = min(max(float(fonte.get("raio_km") or 5), 0.5), 30)
    except (TypeError, ValueError):
        raio = 5.0
    return {"lat": lat, "lon": lon, "raio_km": raio}


def _clinicas_demo(hora=None):
    """Clínicas fictícias da tabela clinicas, no mesmo formato das clínicas reais do OpenStreetMap."""
    lista = consultas.listar_clinicas()
    for c in lista:
        c.update(fonte="demo", horario_conhecido=True, especialidade_inferida=False, site="", osm_url="",
                 horario_texto="24h" if c["aberto_24h"] else f'{c["abre"]}–{c["fecha"]}')
        if hora:
            c["aberta_agora"] = consultas.clinica_aberta(c, hora)
    return lista


def clinicas_para(pos, especialidade=None, hora=None, so_abertas=False, tolerante=False):
    """
    Duas fontes, mesmo formato:
      - pos informado  → clínicas REAIS do OpenStreetMap ao redor de lat/lon (banco/clinicas_osm.py)
      - sem pos        → clínicas fictícias de demonstração (tabela clinicas)
    Retorna (lista, meta). `tolerante=True` relaxa o filtro de especialidade quando ele zera a lista.
    """
    meta = {"fonte": "demo", "aviso": None}
    if pos:
        try:
            lista = clinicas_osm.buscar_clinicas(pos["lat"], pos["lon"], pos["raio_km"])
            meta.update(fonte="osm", raio_km=pos["raio_km"], total_no_raio=len(lista))
            if hora:
                clinicas_osm.anotar_abertas(lista, hora)
        except Exception as e:  # sem internet / Overpass fora → cai para demonstração
            app.logger.warning("OpenStreetMap indisponível: %r", e)
            lista = _clinicas_demo(hora)   # no MESMO formato das do OSM (antes faltava horario_texto → erro 500)
            for c in lista:                # distância até a posição do usuário, não até o tutor fictício
                c["distancia_km"] = round(clinicas_osm.haversine_km(pos["lat"], pos["lon"], c["lat"], c["lon"]), 2)
            meta["aviso"] = ("O OpenStreetMap não respondeu agora; mostrando clínicas de demonstração "
                             "(fictícias, em Sumaré-SP). Tente de novo em alguns minutos.")
    else:
        lista = _clinicas_demo(hora)
    if meta["fonte"] == "osm" and not lista:
        meta["aviso"] = "Nenhuma clínica veterinária mapeada no OpenStreetMap nesse raio. Aumente o raio."
    if especialidade:
        filtrada = [c for c in lista if especialidade in c["especialidades"]]
        if not filtrada and tolerante and lista:
            meta["aviso"] = (meta["aviso"] or "") + f" Nenhuma clínica próxima indica '{especialidade}' no nome; mostrando todas as clínicas próximas — confirme a especialidade por telefone."
            meta["aviso"] = meta["aviso"].strip()
        else:
            lista = filtrada
    if hora and so_abertas:
        # aberta_agora None = horário desconhecido: mantemos na lista, sinalizado no app
        lista = [c for c in lista if c.get("aberta_agora") is not False]
    lista.sort(key=lambda c: c["distancia_km"])
    return lista, meta


@app.get("/api/clinicas")
def api_clinicas():
    """
    Sem lat/lon: clínicas de demonstração (compatível com a versão anterior: `hora` filtra).
    Com lat/lon (+ raio_km): clínicas reais do OpenStreetMap. `hora` anota aberta_agora;
    `so_abertas=1` filtra. `meta=1` devolve {"clinicas": [...], "meta": {...}}.
    """
    especialidade = request.args.get("especialidade") or None
    hora = request.args.get("hora") or None
    if especialidade and especialidade not in ESPECIALIDADES:
        return jsonify({"erro": "especialidade inválida"}), 400
    if hora and not RE_HORA.match(hora):
        return jsonify({"erro": "hora deve estar no formato HH:MM"}), 400
    pos = _posicao(request.args)
    so_abertas = request.args.get("so_abertas") == "1" or (pos is None and hora is not None)
    lista, meta = clinicas_para(pos, especialidade, hora, so_abertas)
    if request.args.get("meta") == "1":
        return jsonify({"clinicas": lista, "meta": meta})
    return jsonify(lista)


@app.get("/api/geocodificar")
def api_geocodificar():
    q = (request.args.get("q") or "").strip()
    if not 3 <= len(q) <= 200:
        return jsonify({"erro": "informe um endereço ou cidade (até 200 caracteres)"}), 400
    try:
        r = clinicas_osm.geocodificar(q)
    except Exception as e:
        return jsonify({"erro": f"serviço de geocodificação indisponível ({type(e).__name__})"}), 502
    if not r:
        return jsonify({"erro": "endereço não encontrado"}), 404
    return jsonify(r)


@app.get("/api/tutores/<int:tutor_id>")
def api_tutor(tutor_id):
    if _tutor_alvo(tutor_id) != tutor_id:
        return _sem_acesso_ao_tutor()
    t = consultas.obter_tutor(tutor_id)
    if t is None:
        return jsonify({"erro": "tutor não encontrado"}), 404
    t.pop("cpf", None)   # CPF só aparece para o próprio dono, em /api/sessao
    return jsonify(t)


@app.get("/api/tutores/<int:tutor_id>/historico")
def api_historico(tutor_id):
    if _tutor_alvo(tutor_id) != tutor_id:
        return _sem_acesso_ao_tutor()
    return jsonify(consultas.historico_tutor(tutor_id))


@app.post("/api/compras")
def api_compras():
    """Registra uma compra do marketplace. É este dado que depois alimenta a IA."""
    corpo = request.get_json(silent=True) or {}
    if (conta := conta_atual()) and conta["tipo"] == "clinica":
        return jsonify({"erro": "contas de clínica não fazem compras na loja"}), 403
    try:
        tutor_id = _tutor_alvo(int(corpo.get("tutor_id", TUTOR_DEMO_ID)))
    except (TypeError, ValueError):
        return jsonify({"erro": "tutor_id inválido"}), 400
    if tutor_id is None:
        return _sem_acesso_ao_tutor()
    try:
        oferta_id, quantidade = int(corpo["oferta_id"]), int(corpo.get("quantidade", 1))
    except (KeyError, ValueError, TypeError):
        return jsonify({"erro": "oferta_id e quantidade devem ser números inteiros"}), 400
    if not 1 <= quantidade <= 20:   # quantidade negativa geraria valor negativo e distorceria a IA
        return jsonify({"erro": "a quantidade deve ficar entre 1 e 20"}), 400
    try:
        compra_id = consultas.registrar_compra(tutor_id, oferta_id, quantidade)
    except ValueError as e:          # mensagem nossa ("oferta X não existe"), sem detalhe interno
        return jsonify({"erro": str(e)}), 400
    return jsonify({"compra_id": compra_id, "historico": consultas.historico_tutor(tutor_id)}), 201


ENTREGAS = {"retirada", "entrega"}
PAGAMENTOS = {"pix", "cartao_entrega", "dinheiro"}


@app.post("/api/pedidos")
def api_pedidos():
    """
    Finaliza o carrinho. Cada item vira uma compra (o dado que alimenta a IA).
    O PAGAMENTO É SIMULADO (projeto acadêmico): nenhum valor é cobrado e nenhum dado de cartão é recebido.
    """
    corpo = request.get_json(silent=True) or {}
    if (conta := conta_atual()) and conta["tipo"] == "clinica":
        return jsonify({"erro": "contas de clínica não fazem compras na loja"}), 403
    try:
        tutor_id = _tutor_alvo(int(corpo.get("tutor_id", TUTOR_DEMO_ID)))
    except (TypeError, ValueError):
        return jsonify({"erro": "tutor_id inválido"}), 400
    if tutor_id is None:
        return _sem_acesso_ao_tutor()
    itens = corpo.get("itens")
    if not isinstance(itens, list) or not 1 <= len(itens) <= 30:
        return jsonify({"erro": "o carrinho está vazio (ou tem itens demais)"}), 400
    try:
        itens = [{"oferta_id": int(i["oferta_id"]), "quantidade": int(i.get("quantidade", 1))} for i in itens]
    except (KeyError, TypeError, ValueError, AttributeError):
        return jsonify({"erro": "item inválido no carrinho"}), 400
    if any(not 1 <= i["quantidade"] <= 20 for i in itens):
        return jsonify({"erro": "a quantidade de cada item deve ficar entre 1 e 20"}), 400
    entrega, pagamento = corpo.get("entrega"), corpo.get("pagamento")
    if entrega not in ENTREGAS:
        return jsonify({"erro": "escolha retirar na loja ou receber em casa"}), 400
    if pagamento not in PAGAMENTOS:
        return jsonify({"erro": "forma de pagamento inválida"}), 400
    try:
        pedido = consultas.registrar_pedido(tutor_id, itens, entrega, pagamento)
    except ValueError as e:
        return jsonify({"erro": str(e)}), 400
    return jsonify(pedido | {"entrega": entrega, "pagamento": pagamento,
                             "historico": consultas.historico_tutor(tutor_id)}), 201


@app.get("/api/pedidos")
def api_listar_pedidos():
    """Meus pedidos: os pedidos do tutor (mesma regra de acesso do histórico)."""
    try:
        tutor_id = _tutor_alvo(int(request.args.get("tutor_id", TUTOR_DEMO_ID)))
    except ValueError:
        return jsonify({"erro": "tutor_id inválido"}), 400
    if tutor_id is None:
        return _sem_acesso_ao_tutor()
    return jsonify(consultas.listar_pedidos(tutor_id))


# ------------------------------------------------------------ [banco] contas (login de DEMONSTRAÇÃO)
# Dois tipos de conta: 'cliente' (tutor + pet) e 'clinica'. A senha é guardada só como hash
# (werkzeug.security). A sessão (flask.session) guarda apenas o id da conta.
RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RE_HORA = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def conta_atual():
    """Conta logada nesta requisição (ou None). Relida do banco: conta apagada = sessão inválida."""
    if "conta" not in g:
        cid = session.get("conta_id")
        g.conta = consultas.obter_conta(conta_id=cid) if cid else None
        if cid and g.conta is None:
            session.clear()
    return g.conta


def exige_conta(tipo=None):
    """Protege uma rota: 401 sem login; 403 se a conta não for do `tipo` exigido."""
    def decorador(rota):
        @wraps(rota)
        def protegida(*args, **kwargs):
            conta = conta_atual()
            if conta is None:
                return jsonify({"erro": "faça login para continuar"}), 401
            if tipo and conta["tipo"] != tipo:
                return jsonify({"erro": f"acesso restrito a contas do tipo '{tipo}'"}), 403
            return rota(*args, **kwargs)
        return protegida
    return decorador


def _tutor_alvo(tutor_pedido):
    """
    Qual tutor esta requisição pode usar:
      - conta cliente logada → sempre o próprio tutor (o id enviado é ignorado);
      - sem login (ou conta clínica) → só o tutor de demonstração, como antes do login existir.
    Retorna None quando o pedido não é permitido.
    """
    conta = conta_atual()
    if conta and conta["tipo"] == "cliente":
        return conta["tutor_id"]
    return TUTOR_DEMO_ID if tutor_pedido == TUTOR_DEMO_ID else None


def _sem_acesso_ao_tutor():
    if conta_atual() is None:
        return jsonify({"erro": "faça login para acessar os dados deste tutor"}), 401
    return jsonify({"erro": "sem permissão para acessar os dados deste tutor"}), 403


def _conta_publica(conta):
    """O que o front-end recebe sobre a conta logada — nunca o hash da senha."""
    dados = {"id": conta["id"], "tipo": conta["tipo"], "email": conta["email"]}
    if conta["tipo"] == "cliente":
        t = consultas.obter_tutor(conta["tutor_id"])
        dados["tutor"] = {k: t[k] for k in ("id", "nome", "telefone", "endereco", "cpf")}
        dados["pet"] = t["pet"]
    else:
        dados["clinica"] = consultas.obter_clinica(conta["clinica_id"])
    return dados


class ErroCadastro(ValueError):
    pass


def _texto(corpo, chave, rotulo, obrigatorio=True, maximo=120):
    v = str(corpo.get(chave) or "").strip()
    if obrigatorio and not v:
        raise ErroCadastro(f"informe {rotulo}")
    if len(v) > maximo:
        raise ErroCadastro(f"{rotulo} deve ter no máximo {maximo} caracteres")
    return v


def _validar_tutor(corpo, com_cpf=True):
    tutor = {"nome": _texto(corpo, "nome", "o nome"),
             "telefone": _texto(corpo, "telefone", "o telefone", obrigatorio=False, maximo=30),
             "endereco": _texto(corpo, "endereco", "o endereço", obrigatorio=False, maximo=200)}
    if com_cpf:
        # CPF FICTÍCIO: validamos só o formato (11 dígitos). Nunca use um CPF real (LGPD).
        digitos = re.sub(r"\D", "", str(corpo.get("cpf") or ""))
        if len(digitos) != 11:
            raise ErroCadastro("CPF deve ter 11 dígitos (use um CPF fictício)")
        tutor["cpf"] = f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"
    return tutor


def _validar_pet(pet):
    especie = str(pet.get("especie") or "").lower()
    if especie not in ESPECIES:
        raise ErroCadastro("espécie do pet deve ser cao ou gato")
    porte = str(pet.get("porte") or ("pequeno" if especie == "gato" else "medio")).lower()
    if porte not in PORTES:
        raise ErroCadastro("porte deve ser pequeno, medio ou grande")
    try:
        idade = float(pet.get("idade_anos"))
    except (TypeError, ValueError):
        raise ErroCadastro("informe a idade do pet em anos")
    if not 0 <= idade <= 30:
        raise ErroCadastro("idade do pet deve estar entre 0 e 30 anos")
    return {"nome": _texto(pet, "nome", "o nome do pet", maximo=60), "especie": especie, "porte": porte,
            "idade_anos": idade, "raca": _texto(pet, "raca", "a raça", obrigatorio=False, maximo=60),
            "observacoes_saude": _texto(pet, "observacoes_saude", "as observações de saúde", obrigatorio=False, maximo=500)}


def _validar_clinica(corpo):
    h24 = bool(corpo.get("aberto_24h"))
    abre, fecha = ("00:00", "23:59") if h24 else (str(corpo.get("abre") or ""), str(corpo.get("fecha") or ""))
    if not (RE_HORA.match(abre) and RE_HORA.match(fecha)):
        raise ErroCadastro("horário de funcionamento deve estar no formato HH:MM (ou marque 24h)")
    esps = corpo.get("especialidades") or []
    if not isinstance(esps, list) or not esps or not set(esps) <= ESPECIALIDADES:
        raise ErroCadastro("escolha ao menos uma especialidade válida: " + ", ".join(sorted(ESPECIALIDADES)))
    return {"nome": _texto(corpo, "nome", "o nome da clínica"),
            "telefone": _texto(corpo, "telefone", "o telefone", maximo=30),
            "endereco": _texto(corpo, "endereco", "o endereço", maximo=200),
            "abre": abre, "fecha": fecha, "aberto_24h": h24, "especialidades": sorted(set(esps))}


def _abrir_sessao(conta_id):
    session.clear()
    session["conta_id"] = conta_id
    g.pop("conta", None)
    return _conta_publica(conta_atual())


@app.post("/api/cadastro")
def api_cadastro():
    """Cria conta cliente (+ tutor + pet) ou conta clínica (+ clínica) e já abre a sessão."""
    if limite_excedido("cadastro", MAX_CADASTROS, JANELA_CADASTRO_S):
        return _muitas_tentativas(JANELA_CADASTRO_S)
    registrar_tentativa("cadastro")
    corpo = request.get_json(silent=True) or {}
    tipo = corpo.get("tipo")
    email = str(corpo.get("email") or "").strip().lower()
    senha = str(corpo.get("senha") or "")
    try:
        if tipo not in ("cliente", "clinica"):
            raise ErroCadastro("tipo de conta deve ser 'cliente' ou 'clinica'")
        if not RE_EMAIL.match(email) or len(email) > 120:
            raise ErroCadastro("e-mail inválido")
        if not 6 <= len(senha) <= 200:
            raise ErroCadastro("a senha deve ter de 6 a 200 caracteres")
        if tipo == "cliente":
            tutor, pet = _validar_tutor(corpo), _validar_pet(corpo.get("pet") or {})
        else:
            clinica = _validar_clinica(corpo)
    except ErroCadastro as e:
        return jsonify({"erro": str(e)}), 400
    if consultas.obter_conta(email=email):
        return jsonify({"erro": "já existe uma conta com este e-mail"}), 409
    try:
        senha_hash = generate_password_hash(senha)
        if tipo == "cliente":
            conta_id = consultas.criar_conta_cliente(email, senha_hash, tutor, pet)
        else:
            conta_id = consultas.criar_conta_clinica(email, senha_hash, clinica)
    except sqlite3.IntegrityError:   # corrida entre duas criações com o mesmo e-mail
        return jsonify({"erro": "já existe uma conta com este e-mail"}), 409
    return jsonify({"conta": _abrir_sessao(conta_id)}), 201


JANELA_LOGIN_S, MAX_LOGIN_ERRADO = 300, 5    # 5 senhas erradas em 5 minutos por IP
JANELA_CADASTRO_S, MAX_CADASTROS = 3600, 10   # 10 tentativas de cadastro por hora por IP
HASH_FALSO = generate_password_hash(secrets.token_hex(8))


@app.post("/api/login")
def api_login():
    if limite_excedido("login", MAX_LOGIN_ERRADO, JANELA_LOGIN_S):
        return _muitas_tentativas(JANELA_LOGIN_S)
    corpo = request.get_json(silent=True) or {}
    conta = consultas.obter_conta(email=str(corpo.get("email") or "").strip().lower()[:120])
    # sem conta, compara com um hash falso: o tempo de resposta não revela quais e-mails existem
    senha_ok = check_password_hash(conta["senha_hash"] if conta else HASH_FALSO, str(corpo.get("senha") or "")[:200])
    if conta is None or not senha_ok:
        registrar_tentativa("login")
        return jsonify({"erro": "e-mail ou senha inválidos"}), 401
    return jsonify({"conta": _abrir_sessao(conta["id"])})


@app.post("/api/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/sessao")
def api_sessao():
    conta = conta_atual()
    return jsonify({"conta": _conta_publica(conta) if conta else None})


@app.put("/api/perfil")
@exige_conta("cliente")
def api_perfil():
    """Atualiza tutor + pet da conta cliente logada (CPF e e-mail não mudam por aqui)."""
    corpo = request.get_json(silent=True) or {}
    try:
        tutor, pet = _validar_tutor(corpo, com_cpf=False), _validar_pet(corpo.get("pet") or {})
    except ErroCadastro as e:
        return jsonify({"erro": str(e)}), 400
    consultas.atualizar_perfil_cliente(conta_atual()["tutor_id"], tutor, pet)
    return jsonify({"conta": _conta_publica(conta_atual())})


# ------------------------------------------------------------ [banco] painel da clínica
@app.get("/api/clinica/painel")
@exige_conta("clinica")
def api_painel_clinica():
    """
    Indicadores para a clínica — AGREGAÇÃO AO BANCO (COUNT/SUM/AVG + GROUP BY), NÃO é IA.
    Só totais agregados de clientes fictícios: nenhum CPF, nome ou dado de saúde individual.
    """
    periodo = "semana" if request.args.get("periodo") == "semana" else "mes"
    return jsonify(consultas.painel_clinica(periodo) | {
        "clinica": consultas.obter_clinica(conta_atual()["clinica_id"])})


# ------------------------------------------------------------ [IA] modelo
@app.get("/api/modelo/metricas")
def api_metricas():
    return jsonify(recomendador.metricas())


@app.post("/api/recomendar")
def api_recomendar():
    """
    Junta duas coisas distintas — e a resposta deixa isso explícito:
      "ia":    o Random Forest prevê a especialidade a partir do perfil do pet,
               da situação relatada e do comportamento de compra (vindo do banco);
      "banco": consulta simples: clínicas com aquela especialidade abertas no horário.
    """
    corpo = request.get_json(silent=True) or {}
    try:
        tutor_id = _tutor_alvo(int(corpo.get("tutor_id", TUTOR_DEMO_ID)))
    except (TypeError, ValueError):
        return jsonify({"erro": "tutor_id inválido"}), 400
    if tutor_id is None:
        return _sem_acesso_ao_tutor()
    especie = str(corpo.get("especie", "cao")).lower()
    porte = str(corpo.get("porte", "medio")).lower()
    if especie not in ESPECIES or porte not in PORTES:
        return jsonify({"erro": "especie deve ser cao|gato e porte pequeno|medio|grande"}), 400
    try:
        idade = float(corpo.get("idade_anos", 5))
    except (TypeError, ValueError):
        return jsonify({"erro": "idade_anos inválida"}), 400
    if not 0 <= idade <= 30:   # também recusa NaN e infinito
        return jsonify({"erro": "idade_anos deve estar entre 0 e 30"}), 400
    situacao = str(corpo.get("situacao", "checkup"))
    if situacao not in SITUACOES:
        return jsonify({"erro": "situação inválida"}), 400
    hora = str(corpo.get("hora") or datetime.now().strftime("%H:%M"))
    if not RE_HORA.match(hora):
        return jsonify({"erro": "hora deve estar no formato HH:MM"}), 400

    historico = consultas.historico_tutor(tutor_id)
    features = {"especie": especie, "idade_anos": idade, "porte": porte, "situacao": situacao,
                **historico["features"]}
    ia = recomendador.prever(features)
    pos = _posicao(corpo)
    clinicas, meta = clinicas_para(pos, ia["especialidade"], hora, so_abertas=True, tolerante=True)
    return jsonify({
        "ia": ia | {"origem": "Random Forest treinado em ml/treinar_modelo.py",
                    "historico_compras": {"total_compras_janela": historico["total_compras_janela"],
                                          "janela_dias": historico["janela_dias"]}},
        "banco": {"hora_consultada": hora, "especialidade_filtrada": ia["especialidade"],
                  "clinicas": clinicas[:12], **meta,
                  "origem": "clínicas reais do OpenStreetMap (banco/clinicas_osm.py), especialidade inferida pelo nome"
                            if meta["fonte"] == "osm" else "consulta SQL em banco/consultas.py (dados de demonstração)"},
    })


if __name__ == "__main__":
    print("PatasPerto rodando em http://127.0.0.1:5000  (Ctrl+C para parar)")
    # Modo debug (recarrega ao salvar e mostra o depurador do Werkzeug, que EXECUTA código pelo navegador):
    # DESLIGADO por padrão. Para desenvolver com recarga automática: FLASK_DEBUG=1 python app.py
    app.run(host="127.0.0.1", port=5000, debug=os.environ.get("FLASK_DEBUG") == "1")
