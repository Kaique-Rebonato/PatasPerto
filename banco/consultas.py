"""
Funções de acesso ao banco SQLite usadas pela API (app.py).

Tudo aqui é CONSULTA A BANCO (filtros, agregações) — não é IA.
A única ponte com a IA é `historico_tutor`, que transforma as compras
registradas na loja nas features de comportamento que o modelo consome.
"""
import os
import random
import sqlite3
from datetime import date, datetime, timedelta

AQUI = os.path.dirname(os.path.abspath(__file__))
CAMINHO_DB = os.path.join(AQUI, "patasperto.db")

GRUPOS_IA = ["alimentacao", "petisco", "higiene", "brinquedo", "pele", "bucal", "articular"]
JANELA_DIAS = 90  # janela de histórico usada para calcular o comportamento de compra


def conectar():
    con = sqlite3.connect(CAMINHO_DB)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


# ------------------------------------------------------------------ loja
def listar_ofertas():
    """Todas as ofertas com produto (características, avaliações) e loja embutidos."""
    with conectar() as con:
        produtos = {}
        for r in con.execute("SELECT * FROM produtos"):
            produtos[r["id"]] = dict(r) | {"caracteristicas": [], "comentarios": []}
        for r in con.execute("SELECT * FROM caracteristicas"):
            produtos[r["produto_id"]]["caracteristicas"].append([r["rotulo"], r["valor"]])
        for r in con.execute("SELECT * FROM avaliacoes"):
            produtos[r["produto_id"]]["comentarios"].append(
                {"autor": r["autor"], "nota": r["nota"], "texto": r["texto"]})
        lojas = {r["id"]: dict(r) for r in con.execute("SELECT * FROM lojas")}
        ofertas = []
        for r in con.execute("SELECT * FROM ofertas ORDER BY id"):
            ofertas.append({
                "id": r["id"], "preco": r["preco"], "entrega": r["entrega"],
                "produto": produtos[r["produto_id"]], "loja": lojas[r["loja_id"]],
            })
        return ofertas


def obter_oferta(oferta_id):
    with conectar() as con:
        r = con.execute("SELECT * FROM ofertas WHERE id=?", (oferta_id,)).fetchone()
        return dict(r) if r else None


# -------------------------------------------------------------- clínicas
def _minutos(hhmm):
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def clinica_aberta(clinica, hora):
    """Regra de horário: trata 24h e faixas que cruzam a meia-noite (ex.: 19:00–07:00)."""
    if clinica["aberto_24h"]:
        return True
    agora, abre, fecha = _minutos(hora), _minutos(clinica["abre"]), _minutos(clinica["fecha"])
    if abre <= fecha:
        return abre <= agora < fecha
    return agora >= abre or agora < fecha  # cruza a meia-noite


def listar_clinicas(especialidade=None, hora=None):
    """Filtra clínicas por especialidade e por 'aberta no horário'. Ordena por distância."""
    with conectar() as con:
        clinicas = {r["id"]: dict(r) | {"especialidades": []} for r in con.execute("SELECT * FROM clinicas")}
        for r in con.execute("SELECT * FROM clinica_especialidades"):
            clinicas[r["clinica_id"]]["especialidades"].append(r["especialidade"])
    lista = list(clinicas.values())
    if especialidade:
        lista = [c for c in lista if especialidade in c["especialidades"]]
    if hora:
        for c in lista:
            c["aberta_agora"] = clinica_aberta(c, hora)
        lista = [c for c in lista if c["aberta_agora"]]
    lista.sort(key=lambda c: c["distancia_km"])
    return lista


# --------------------------------------------------------- tutor / compras
def obter_tutor(tutor_id):
    with conectar() as con:
        t = con.execute("SELECT * FROM tutores WHERE id=?", (tutor_id,)).fetchone()
        if not t:
            return None
        pet = con.execute("SELECT * FROM pets WHERE tutor_id=? ORDER BY id LIMIT 1", (tutor_id,)).fetchone()
        return dict(t) | {"pet": dict(pet) if pet else None}


def registrar_compra(tutor_id, oferta_id, quantidade=1):
    """Grava uma compra feita no marketplace. É o dado que depois alimenta a IA."""
    oferta = obter_oferta(oferta_id)
    if oferta is None:
        raise ValueError(f"oferta {oferta_id} não existe")
    with conectar() as con:
        cur = con.execute(
            "INSERT INTO compras (tutor_id, oferta_id, data, quantidade, valor) VALUES (?,?,?,?,?)",
            (tutor_id, oferta_id, date.today().isoformat(), quantidade, oferta["preco"] * quantidade))
        return cur.lastrowid


def historico_tutor(tutor_id, janela_dias=JANELA_DIAS):
    """
    Resume as compras do tutor nos últimos `janela_dias` em features de comportamento:
      compras_mes         = número de compras / meses da janela
      gasto_<grupo_ia>    = R$ por mês em cada grupo de produto
    Essas chaves têm exatamente os nomes das colunas do dataset de treino.
    """
    inicio = (date.today() - timedelta(days=janela_dias)).isoformat()
    meses = janela_dias / 30.0
    feats = {"compras_mes": 0.0} | {f"gasto_{g}": 0.0 for g in GRUPOS_IA}
    with conectar() as con:
        linhas = con.execute("""
            SELECT p.grupo_ia, COUNT(*) AS n, SUM(c.valor) AS total
              FROM compras c
              JOIN ofertas  o ON o.id = c.oferta_id
              JOIN produtos p ON p.id = o.produto_id
             WHERE c.tutor_id = ? AND c.data >= ?
             GROUP BY p.grupo_ia""", (tutor_id, inicio)).fetchall()
        recentes = con.execute("""
            SELECT c.data, c.valor, p.nome, p.grupo_ia
              FROM compras c JOIN ofertas o ON o.id = c.oferta_id JOIN produtos p ON p.id = o.produto_id
             WHERE c.tutor_id = ? ORDER BY c.data DESC, c.id DESC LIMIT 8""", (tutor_id,)).fetchall()
    total_compras = 0
    for r in linhas:
        total_compras += r["n"]
        feats[f"gasto_{r['grupo_ia']}"] = round(r["total"] / meses, 2)
    feats["compras_mes"] = round(total_compras / meses, 2)
    return {"features": feats, "total_compras_janela": total_compras, "janela_dias": janela_dias,
            "recentes": [dict(r) for r in recentes]}


# ------------------------------------------------------------------ contas
# Login de DEMONSTRAÇÃO. O hash da senha é gerado/validado em app.py (werkzeug.security);
# aqui só gravamos e lemos — a senha em texto puro nunca chega ao banco.
def obter_conta(conta_id=None, email=None):
    with conectar() as con:
        if conta_id is not None:
            r = con.execute("SELECT * FROM contas WHERE id=?", (conta_id,)).fetchone()
        else:
            r = con.execute("SELECT * FROM contas WHERE email=?", ((email or "").strip(),)).fetchone()
        return dict(r) if r else None


def criar_conta_cliente(email, senha_hash, tutor, pet):
    """Cria tutor + pet (tabelas já existentes) e a conta vinculada, numa única transação."""
    from criar_banco import CENTRO   # tutor novo fica no centro da cidade fictícia (mapa de demonstração)
    agora = datetime.now().isoformat(timespec="seconds")
    with conectar() as con:
        tid = con.execute(
            "INSERT INTO tutores (nome, email, telefone, endereco, lat, lon, cpf) VALUES (?,?,?,?,?,?,?)",
            (tutor["nome"], email, tutor["telefone"], tutor["endereco"], *CENTRO, tutor["cpf"])).lastrowid
        con.execute(
            "INSERT INTO pets (tutor_id, nome, especie, idade_anos, porte, raca, observacoes_saude) VALUES (?,?,?,?,?,?,?)",
            (tid, pet["nome"], pet["especie"], pet["idade_anos"], pet["porte"], pet["raca"], pet["observacoes_saude"]))
        return con.execute(
            "INSERT INTO contas (tipo, email, senha_hash, tutor_id, criado_em) VALUES ('cliente',?,?,?,?)",
            (email, senha_hash, tid, agora)).lastrowid


def criar_conta_clinica(email, senha_hash, clinica):
    """Cria a clínica (tabela clinicas + especialidades) e a conta vinculada, numa única transação."""
    from criar_banco import coord
    dist = round(random.uniform(0.5, 3.0), 1)        # posição FICTÍCIA na cidade de demonstração
    lat, lon = coord(dist, random.uniform(0, 360))
    agora = datetime.now().isoformat(timespec="seconds")
    with conectar() as con:
        cid = con.execute(
            "INSERT INTO clinicas (nome, endereco, distancia_km, telefone, abre, fecha, aberto_24h, lat, lon) VALUES (?,?,?,?,?,?,?,?,?)",
            (clinica["nome"], clinica["endereco"], dist, clinica["telefone"], clinica["abre"], clinica["fecha"],
             int(clinica["aberto_24h"]), lat, lon)).lastrowid
        con.executemany("INSERT INTO clinica_especialidades VALUES (?,?)", [(cid, e) for e in clinica["especialidades"]])
        return con.execute(
            "INSERT INTO contas (tipo, email, senha_hash, clinica_id, criado_em) VALUES ('clinica',?,?,?,?)",
            (email, senha_hash, cid, agora)).lastrowid


def atualizar_perfil_cliente(tutor_id, tutor, pet):
    """Atualiza os dados do tutor e do (primeiro) pet de uma conta cliente."""
    with conectar() as con:
        con.execute("UPDATE tutores SET nome=?, telefone=?, endereco=? WHERE id=?",
                    (tutor["nome"], tutor["telefone"], tutor["endereco"], tutor_id))
        con.execute("""UPDATE pets SET nome=?, especie=?, idade_anos=?, porte=?, raca=?, observacoes_saude=?
                        WHERE id = (SELECT id FROM pets WHERE tutor_id=? ORDER BY id LIMIT 1)""",
                    (pet["nome"], pet["especie"], pet["idade_anos"], pet["porte"], pet["raca"],
                     pet["observacoes_saude"], tutor_id))


def obter_clinica(clinica_id):
    with conectar() as con:
        c = con.execute("SELECT * FROM clinicas WHERE id=?", (clinica_id,)).fetchone()
        if not c:
            return None
        esps = [r[0] for r in con.execute(
            "SELECT especialidade FROM clinica_especialidades WHERE clinica_id=?", (clinica_id,))]
        return dict(c) | {"especialidades": esps}


# --------------------------------------------------- painel da clínica
# ATENÇÃO: isto é CONSULTA/AGREGAÇÃO AO BANCO (COUNT, SUM, AVG + GROUP BY) — NÃO é IA.
# Nenhum modelo é treinado ou consultado aqui; os números saem direto das tabelas
# compras/ofertas/produtos/pets/tutores. A clínica só recebe totais agregados —
# nunca CPF, nome ou observações de saúde de um cliente individual.
JANELA_PAINEL_DIAS = 180
MIN_GRUPO = 2   # tamanho mínimo de um grupo exibido no painel


def _periodos(periodo, hoje):
    """Chaves e rótulos dos últimos 6 meses ou 12 semanas, para o gráfico não ter buracos."""
    if periodo == "semana":
        seg = hoje - timedelta(days=hoje.weekday())
        semanas = [seg - timedelta(weeks=i) for i in range(11, -1, -1)]
        return [(s.strftime("%Y-%W"), s.strftime("%d/%m")) for s in semanas], semanas[0].isoformat()
    meses, a, m = [], hoje.year, hoje.month
    for _ in range(6):
        meses.append((f"{a:04d}-{m:02d}", f"{m:02d}/{a}"))
        a, m = (a, m - 1) if m > 1 else (a - 1, 12)
    meses.reverse()
    return meses, meses[0][0] + "-01"


def painel_clinica(periodo="mes", janela_dias=JANELA_PAINEL_DIAS):
    hoje = date.today()
    inicio = (hoje - timedelta(days=janela_dias)).isoformat()
    with conectar() as con:
        # 1) Totais da base (COUNT / SUM)
        totais = dict(con.execute("""
            SELECT (SELECT COUNT(*) FROM tutores)                                        AS clientes,
                   (SELECT COUNT(*) FROM pets)                                           AS pets,
                   (SELECT COUNT(*) FROM pets WHERE COALESCE(observacoes_saude, '') <> '') AS pets_com_obs_saude,
                   COUNT(*)                                                              AS compras,
                   COALESCE(SUM(quantidade), 0)                                          AS itens,
                   COALESCE(ROUND(SUM(valor), 2), 0)                                     AS faturamento,
                   COUNT(DISTINCT tutor_id)                                              AS clientes_ativos
              FROM compras WHERE data >= ?""", (inicio,)).fetchone())
        totais["ticket_medio"] = round(totais["faturamento"] / totais["compras"], 2) if totais["compras"] else 0

        # 2) O que os clientes mais compram — GROUP BY produto
        mais_comprados = [dict(r) for r in con.execute("""
            SELECT p.nome, p.categoria, SUM(c.quantidade) AS itens,
                   COUNT(DISTINCT c.tutor_id) AS clientes, ROUND(SUM(c.valor), 2) AS total
              FROM compras c
              JOIN ofertas  o ON o.id = c.oferta_id
              JOIN produtos p ON p.id = o.produto_id
             WHERE c.data >= ?
             GROUP BY p.id
             ORDER BY itens DESC, total DESC
             LIMIT 8""", (inicio,))]

        # 3) Espécie e raça mais frequentes — GROUP BY espécie / raça
        especies = [dict(r) for r in con.execute("""
            SELECT especie, COUNT(*) AS n, ROUND(AVG(idade_anos), 1) AS idade_media
              FROM pets GROUP BY especie ORDER BY n DESC""")]
        # Grupos com menos de MIN_GRUPO pets viram "Outras": raça é texto livre e um grupo
        # de 1 pode identificar um cliente (minimização de dados, LGPD).
        racas = [dict(r) for r in con.execute("""
            SELECT especie, raca, SUM(n) AS n FROM (
                SELECT especie,
                       CASE WHEN COUNT(*) >= ? THEN COALESCE(NULLIF(TRIM(raca), ''), 'Não informada')
                            ELSE 'Outras' END AS raca,
                       COUNT(*) AS n
                  FROM pets
                 GROUP BY especie, COALESCE(NULLIF(TRIM(raca), ''), 'Não informada'))
             GROUP BY especie, raca
             ORDER BY raca = 'Outras', n DESC, raca
             LIMIT 10""", (MIN_GRUPO,))]

        # 4) "Match" categoria × espécie — GROUP BY espécie, categoria.
        #    A compra é atribuída à espécie do pet do tutor (no demo, 1 pet por tutor).
        cruzado = con.execute("""
            SELECT pe.especie, p.categoria, SUM(c.quantidade) AS itens
              FROM compras c
              JOIN ofertas  o  ON o.id = c.oferta_id
              JOIN produtos p  ON p.id = o.produto_id
              JOIN pets     pe ON pe.tutor_id = c.tutor_id
             WHERE c.data >= ?
             GROUP BY pe.especie, p.categoria""", (inicio,)).fetchall()

        # 5) Volume de compras por período — GROUP BY mês ou semana
        formato = "%Y-%W" if periodo == "semana" else "%Y-%m"
        rotulos, inicio_serie = _periodos(periodo, hoje)
        por_periodo = {r["chave"]: dict(r) for r in con.execute("""
            SELECT strftime(?, data) AS chave, COUNT(*) AS compras, ROUND(SUM(valor), 2) AS valor
              FROM compras WHERE data >= ?
             GROUP BY chave""", (formato, inicio_serie))}

    # Aritmética sobre os totais acima (não é modelo): participação da categoria dentro da espécie
    # e "afinidade" = participação na espécie ÷ participação geral (> 1 = compra acima da média).
    tot_especie, tot_categoria, total = {}, {}, 0
    for r in cruzado:
        tot_especie[r["especie"]] = tot_especie.get(r["especie"], 0) + r["itens"]
        tot_categoria[r["categoria"]] = tot_categoria.get(r["categoria"], 0) + r["itens"]
        total += r["itens"]
    match = {}
    for r in cruzado:
        part = r["itens"] / tot_especie[r["especie"]]
        match.setdefault(r["especie"], []).append({
            "categoria": r["categoria"], "itens": r["itens"], "participacao": round(part, 3),
            "afinidade": round(part / (tot_categoria[r["categoria"]] / total), 2)})
    for lista in match.values():
        lista.sort(key=lambda x: -x["itens"])

    volume = [{"periodo": rot, "chave": ch, "compras": por_periodo.get(ch, {}).get("compras", 0),
               "valor": por_periodo.get(ch, {}).get("valor") or 0.0} for ch, rot in rotulos]

    return {"janela_dias": janela_dias, "periodo": periodo, "totais": totais, "mais_comprados": mais_comprados,
            "especies": especies, "racas": racas, "match_categoria_especie": match, "volume": volume,
            "origem": "agregações SQL (COUNT/SUM/AVG + GROUP BY) em banco/consultas.py — não é IA"}
