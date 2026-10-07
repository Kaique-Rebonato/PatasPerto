-- PatasPerto — esquema do banco (SQLite)
-- Camada "Dados": tudo que o app exibe e tudo que a IA consome vem daqui.

PRAGMA foreign_keys = ON;

CREATE TABLE lojas (
  id             INTEGER PRIMARY KEY,
  nome           TEXT NOT NULL,
  distancia_km   REAL NOT NULL,
  nota           REAL NOT NULL,
  qtd_avaliacoes INTEGER NOT NULL,
  endereco       TEXT NOT NULL,
  lat            REAL NOT NULL,   -- coordenadas fictícias (região de Sumaré-SP)
  lon            REAL NOT NULL
);

CREATE TABLE produtos (
  id        INTEGER PRIMARY KEY,
  nome      TEXT NOT NULL,
  categoria TEXT NOT NULL,   -- categoria exibida no app (Cães, Gatos, Higiene...)
  grupo_ia  TEXT NOT NULL,   -- grupo que o modelo enxerga: alimentacao|petisco|higiene|brinquedo|pele|bucal|articular
  img       TEXT NOT NULL,   -- chave da ilustração SVG no front-end
  descricao TEXT NOT NULL
);

CREATE TABLE caracteristicas (
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  rotulo     TEXT NOT NULL,
  valor      TEXT NOT NULL
);

CREATE TABLE avaliacoes (
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  autor      TEXT NOT NULL,
  nota       INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  texto      TEXT NOT NULL
);

CREATE TABLE ofertas (
  id         INTEGER PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  loja_id    INTEGER NOT NULL REFERENCES lojas(id),
  preco      REAL NOT NULL,
  entrega    TEXT NOT NULL
);

CREATE TABLE clinicas (
  id           INTEGER PRIMARY KEY,
  nome         TEXT NOT NULL,
  endereco     TEXT NOT NULL,
  distancia_km REAL NOT NULL,
  telefone     TEXT NOT NULL,
  abre         TEXT NOT NULL,   -- "HH:MM"
  fecha        TEXT NOT NULL,   -- "HH:MM"
  aberto_24h   INTEGER NOT NULL DEFAULT 0,
  lat          REAL NOT NULL,     -- coordenadas fictícias, coerentes com distancia_km
  lon          REAL NOT NULL
);

CREATE TABLE clinica_especialidades (
  clinica_id    INTEGER NOT NULL REFERENCES clinicas(id),
  especialidade TEXT NOT NULL
);

CREATE TABLE tutores (
  id       INTEGER PRIMARY KEY,
  nome     TEXT NOT NULL,
  email    TEXT,
  telefone TEXT,
  endereco TEXT,
  lat      REAL,                  -- posição do tutor: centro do mapa e origem das distâncias
  lon      REAL,
  cpf      TEXT                   -- FICTÍCIO (projeto acadêmico; nunca usar CPF real — LGPD)
);

CREATE TABLE pets (
  id         INTEGER PRIMARY KEY,
  tutor_id   INTEGER NOT NULL REFERENCES tutores(id),
  nome       TEXT NOT NULL,
  especie    TEXT NOT NULL,   -- cao | gato
  idade_anos REAL NOT NULL,
  porte      TEXT NOT NULL,   -- pequeno | medio | grande
  raca              TEXT,     -- ex.: "SRD", "Labrador"
  observacoes_saude TEXT      -- problemas/observações de saúde — FICTÍCIOS (dado sensível na LGPD)
);

-- Cada compra feita no marketplace vira um registro aqui.
-- É esta tabela que alimenta as features de comportamento de compra da IA.
CREATE TABLE compras (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tutor_id   INTEGER NOT NULL REFERENCES tutores(id),
  oferta_id  INTEGER NOT NULL REFERENCES ofertas(id),
  data       TEXT NOT NULL,   -- ISO "YYYY-MM-DD"
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor      REAL NOT NULL
);

-- Contas de acesso (login de DEMONSTRAÇÃO). Dois tipos:
--   cliente → vinculada a um tutor (tabela tutores, com o pet em pets)
--   clinica → vinculada a uma clínica (tabela clinicas)
-- A senha NUNCA é guardada em texto puro: só o hash (werkzeug.security).
CREATE TABLE contas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo       TEXT NOT NULL CHECK (tipo IN ('cliente', 'clinica')),
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  tutor_id   INTEGER REFERENCES tutores(id),
  clinica_id INTEGER REFERENCES clinicas(id),
  criado_em  TEXT NOT NULL,     -- ISO datetime
  CHECK ((tipo = 'cliente' AND tutor_id IS NOT NULL AND clinica_id IS NULL) OR
         (tipo = 'clinica' AND clinica_id IS NOT NULL AND tutor_id IS NULL))
);

-- Cache das consultas externas (Overpass/OpenStreetMap e Nominatim), com validade.
-- Evita repetir chamadas de rede na apresentação e respeita os limites das APIs públicas.
CREATE TABLE cache_externo (
  chave     TEXT PRIMARY KEY,
  conteudo  TEXT NOT NULL,     -- JSON
  criado_em TEXT NOT NULL      -- ISO datetime
);
