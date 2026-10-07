/* ============================================================
   PatasPerto — front-end (app.js)
   Os dados NÃO estão mais chumbados aqui: lojas, produtos,
   ofertas e clínicas vêm da API Flask (app.py) que lê o SQLite.
   Seções: Loja · Recomendação (IA) · Emergência · Perfil
   ============================================================ */

const API = "";            // mesma origem (a página é servida pelo Flask)
let TUTOR_ID = 1;          // tutor demo do banco; com conta cliente logada, vira o tutor da conta
let conta = null;          // conta logada (GET /api/sessao) — null no modo demonstração

const ILUSTRACOES = {
  racaoCao: '<svg viewBox="0 0 100 100"><rect x="28" y="26" width="44" height="58" rx="6" fill="#D98A3D"/><path d="M28 26 L40 19 L60 19 L72 26 Z" fill="#B5702B"/><circle cx="50" cy="56" r="6" fill="#5A3A1A"/><circle cx="42" cy="48" r="3" fill="#5A3A1A"/><circle cx="50" cy="46" r="3" fill="#5A3A1A"/><circle cx="58" cy="48" r="3" fill="#5A3A1A"/></svg>',
  racaoGato: '<svg viewBox="0 0 100 100"><rect x="28" y="26" width="44" height="58" rx="6" fill="#3E8FC0"/><path d="M28 26 L40 19 L60 19 L72 26 Z" fill="#2E6E96"/><ellipse cx="47" cy="56" rx="12" ry="7" fill="#fff"/><path d="M58 56 L67 49 L67 63 Z" fill="#fff"/><circle cx="42" cy="54" r="1.6" fill="#2E6E96"/></svg>',
  bola: '<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="26" fill="#E24B4A"/><line x1="24" y1="52" x2="76" y2="52" stroke="#B23636" stroke-width="3"/><ellipse cx="50" cy="52" rx="10" ry="26" fill="none" stroke="#B23636" stroke-width="3"/><circle cx="42" cy="44" r="6" fill="#fff" opacity="0.55"/></svg>',
  caminha: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="74" rx="32" ry="11" fill="#B98E57"/><ellipse cx="50" cy="70" rx="26" ry="8" fill="#E7D3A8"/><path d="M30 68 q20 -17 40 0 q-20 7 -40 0 Z" fill="#8A7A63"/><circle cx="35" cy="63" r="6" fill="#8A7A63"/><path d="M31 59 l1 -5 4 3 Z" fill="#8A7A63"/><path d="M39 59 l-1 -5 -4 3 Z" fill="#8A7A63"/></svg>',
  areia: '<svg viewBox="0 0 100 100"><rect x="30" y="26" width="40" height="56" rx="6" fill="#8FB3C7"/><path d="M30 26 L41 20 L59 20 L70 26 Z" fill="#6E93A8"/><g fill="#4F6B7D"><circle cx="42" cy="52" r="2"/><circle cx="50" cy="48" r="2"/><circle cx="58" cy="54" r="2"/><circle cx="46" cy="60" r="2"/><circle cx="55" cy="62" r="2"/><circle cx="50" cy="56" r="2"/></g></svg>',
  petisco: '<svg viewBox="0 0 100 100"><g transform="rotate(-28 50 50)" fill="#E8C98A" stroke="#C9A461" stroke-width="2"><circle cx="32" cy="45" r="7"/><circle cx="32" cy="57" r="7"/><circle cx="68" cy="45" r="7"/><circle cx="68" cy="57" r="7"/><rect x="32" y="44" width="36" height="14" rx="4"/></g></svg>'
,
  antipulgas: '<svg viewBox="0 0 100 100"><path d="M40 20 h20 v14 l8 10 v34 a8 8 0 0 1 -8 8 h-20 a8 8 0 0 1 -8 -8 v-34 l8 -10 Z" fill="#7BC47F"/><rect x="40" y="14" width="20" height="8" rx="2" fill="#4E8F52"/><path d="M36 56 h28" stroke="#fff" stroke-width="3"/><circle cx="50" cy="70" r="6" fill="#fff"/></svg>',
  shampoo: '<svg viewBox="0 0 100 100"><rect x="34" y="34" width="32" height="50" rx="8" fill="#6FB1E8"/><rect x="42" y="18" width="16" height="18" rx="3" fill="#3C7FB8"/><rect x="45" y="12" width="10" height="8" rx="2" fill="#2E6693"/><ellipse cx="50" cy="60" rx="10" ry="12" fill="#fff" opacity=".7"/></svg>',
  dental: '<svg viewBox="0 0 100 100"><path d="M30 30 q20 -14 40 0 q6 22 -4 46 q-6 8 -10 -6 q-4 -12 -12 0 q-4 14 -10 6 q-10 -24 -4 -46 Z" fill="#fff" stroke="#8FC9A0" stroke-width="4"/><path d="M40 40 q10 -6 20 0" stroke="#8FC9A0" stroke-width="3" fill="none"/></svg>',
  escova: '<svg viewBox="0 0 100 100"><rect x="46" y="30" width="10" height="56" rx="5" fill="#F0A24A"/><rect x="40" y="14" width="22" height="20" rx="4" fill="#fff" stroke="#C9A461" stroke-width="2"/><g fill="#E24B4A"><rect x="43" y="17" width="3" height="14"/><rect x="49" y="17" width="3" height="14"/><rect x="55" y="17" width="3" height="14"/></g></svg>',
  suplemento: '<svg viewBox="0 0 100 100"><rect x="30" y="30" width="40" height="54" rx="8" fill="#F2C14E"/><rect x="34" y="22" width="32" height="12" rx="3" fill="#C9962B"/><rect x="36" y="46" width="28" height="22" rx="3" fill="#fff"/><path d="M42 57 h16 M50 49 v16" stroke="#E24B4A" stroke-width="4"/></svg>',
  racaoSenior: '<svg viewBox="0 0 100 100"><rect x="28" y="26" width="44" height="58" rx="6" fill="#8E6BBF"/><path d="M28 26 L40 19 L60 19 L72 26 Z" fill="#6A4D94"/><text x="50" y="62" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff" font-family="Arial">7+</text></svg>',
  racaoLight: '<svg viewBox="0 0 100 100"><rect x="28" y="26" width="44" height="58" rx="6" fill="#5DC1A0"/><path d="M28 26 L40 19 L60 19 L72 26 Z" fill="#3E9A7C"/><path d="M38 62 q12 -22 24 0" stroke="#fff" stroke-width="4" fill="none"/><circle cx="50" cy="48" r="4" fill="#fff"/></svg>',
  tapete: '<svg viewBox="0 0 100 100"><rect x="18" y="30" width="64" height="44" rx="6" fill="#DDE9F7" stroke="#9DB9DA" stroke-width="3"/><path d="M26 38 h48 M26 46 h48 M26 54 h48 M26 62 h48" stroke="#B8CFE9" stroke-width="2"/><ellipse cx="62" cy="58" rx="9" ry="6" fill="#F2D77A"/></svg>'
};

/* ---- Classes de domínio (as mesmas do protótipo; agora hidratadas via API) ---- */
class Loja {
  constructor(d) { Object.assign(this, { id: d.id, nome: d.nome, distanciaKm: d.distancia_km, nota: d.nota, qtdAvaliacoes: d.qtd_avaliacoes, endereco: d.endereco }); }
}
class Produto {
  constructor(d) { Object.assign(this, { id: d.id, nome: d.nome, categoria: d.categoria, grupoIa: d.grupo_ia, img: d.img, descricao: d.descricao, caracteristicas: d.caracteristicas, comentarios: d.comentarios }); }
  mediaAvaliacoes() { return this.comentarios.length ? this.comentarios.reduce((s, c) => s + c.nota, 0) / this.comentarios.length : 0; }
}
class Oferta {
  constructor(id, produto, loja, preco, entrega) { Object.assign(this, { id, produto, loja, preco, entrega }); }
  frete() { return this.preco >= 100 ? 0 : Math.round((8.90 + this.loja.distanciaKm * 4) * 100) / 100; }
  prazoEntrega() { const d = this.loja.distanciaKm; return d < 1 ? "1 dia útil" : d < 2 ? "2 dias úteis" : "3 dias úteis"; }
  tempoRetirada() { return Math.max(2, Math.round(this.loja.distanciaKm * 4)) + " min de carro"; }
}
class Catalogo {
  constructor() { this.ofertas = []; }
  adicionar(o) { this.ofertas.push(o); }
  buscar(termo) { const t = this._n(termo); return t === "" ? this.ofertas.slice() : this.ofertas.filter(o => this._n(o.produto.nome).includes(t) || this._n(o.produto.categoria).includes(t)); }
  ofertasDoProduto(p) { return this.ofertas.filter(o => o.produto.id === p.id); }
  _n(t) { return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
}

const catalogo = new Catalogo();
let metricasModelo = null;

/* ---- Utilidades ---- */
const $ = id => document.getElementById(id);
const grade = $("grade"), info = $("info"), campo = $("campoBusca");
const telas = { lista: $("telaLista"), produto: $("telaProduto"), emergencia: $("telaEmergencia"), recomendacao: $("telaRecomendacao"), perfil: $("telaPerfil"), mapa: $("telaMapa"),
  login: $("telaLogin"), painel: $("telaPainel") };
let termoAtual = "", ordemAtual = "preco";

const fmt = v => "R$ " + v.toFixed(2).replace(".", ",");
const num1 = v => v.toFixed(1).replace(".", ",");
const pct = p => Math.round(p * 100) + "%";
const iconeEntrega = e => e.startsWith("Retira") ? "🏪" : "🚚";
const estrelas = n => "★".repeat(n) + "☆".repeat(5 - n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const horaAgora = () => new Date().toTimeString().slice(0, 5);

function toast(msg, ms = 2600) {
  const t = $("toast"); t.textContent = msg; t.classList.remove("oculto");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add("oculto"), ms);
}

async function api(caminho, opcoes) {
  const r = await fetch(API + caminho, opcoes ? { headers: { "Content-Type": "application/json" }, ...opcoes } : undefined);
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corpo.erro || ("HTTP " + r.status));
  return corpo;
}

const MSG_SEM_API = 'Não foi possível falar com o back-end. Inicie a API com <code>python app.py</code> e abra <b>http://127.0.0.1:5000</b>.';

/* ---- Carregamento dos dados (a base agora vem do SQLite via API) ---- */
async function carregarDados() {
  try {
    const ofertas = await api("/api/ofertas");
    const lojas = {}, produtos = {};
    ofertas.forEach(o => {
      lojas[o.loja.id] = lojas[o.loja.id] || new Loja(o.loja);
      produtos[o.produto.id] = produtos[o.produto.id] || new Produto(o.produto);
      catalogo.adicionar(new Oferta(o.id, produtos[o.produto.id], lojas[o.loja.id], o.preco, o.entrega));
    });
    render();
  } catch (e) {
    info.textContent = "";
    grade.innerHTML = '<div class="aviso-erro" style="grid-column:1/-1">' + MSG_SEM_API + '</div>';
  }
  api("/api/modelo/metricas").then(m => { metricasModelo = m; }).catch(() => {});
  posicaoTutor().catch(() => {});
}

/* ---- Lista / grade ---- */
function render() {
  let res = catalogo.buscar(termoAtual);
  if (ordemAtual === "preco") res.sort((a, b) => a.preco - b.preco);
  else res.sort((a, b) => a.loja.distanciaKm - b.loja.distanciaKm);

  let menor = null, perto = null;
  res.forEach(o => {
    if (!menor || o.preco < menor.preco) menor = o;
    if (!perto || o.loja.distanciaKm < perto.loja.distanciaKm) perto = o;
  });

  grade.innerHTML = "";
  if (res.length === 0) {
    info.textContent = "";
    grade.innerHTML = '<p class="vazio">Nenhum produto encontrado para “' + esc(termoAtual) + '”. Tente “ração”, “antipulgas” ou “dental”.</p>';
    return;
  }
  info.textContent = res.length + " ofertas perto de você" + (termoAtual.trim() ? " para “" + termoAtual + "”" : "") + " · dados do banco SQLite";

  res.forEach(o => {
    let badges = "";
    if (o === menor) badges += '<span class="badge verde">Menor preço</span>';
    if (o === perto) badges += '<span class="badge azul">Mais perto</span>';
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      (badges ? '<div class="badges">' + badges + '</div>' : '') +
      '<div class="imgbox">' + (ILUSTRACOES[o.produto.img] || "") + '</div>' +
      '<div class="corpo">' +
        '<p class="preco">' + fmt(o.preco) + '</p>' +
        '<p class="titulo">' + esc(o.produto.nome) + '</p>' +
        '<p class="aval">★ ' + num1(o.loja.nota) + ' <span class="qtd">(' + o.loja.qtdAvaliacoes + ')</span></p>' +
        '<p class="entrega">' + iconeEntrega(o.entrega) + ' ' + o.entrega + ' · ' + num1(o.loja.distanciaKm) + ' km</p>' +
        '<p class="loja">' + esc(o.loja.nome) + '</p>' +
      '</div>';
    card.addEventListener("click", () => abrirProduto(o));
    grade.appendChild(card);
  });
}

/* ---- Página do produto ---- */
function abrirProduto(o) {
  const prod = o.produto, frete = o.frete(), media = prod.mediaAvaliacoes();
  const freteTxt = frete === 0 ? "Grátis" : fmt(frete);

  const tabelaCarac = '<table class="tabela">' + prod.caracteristicas.map(c => '<tr><td class="rot">' + esc(c[0]) + '</td><td>' + esc(c[1]) + '</td></tr>').join('') + '</table>';
  const listaComent = prod.comentarios.map(c =>
    '<div class="coment"><div class="topo"><span class="autor">' + esc(c.autor) + '</span><span class="estrelas">' + estrelas(c.nota) + '</span></div><p class="txt">' + esc(c.texto) + '</p></div>').join('');
  const painelAval = '<div class="resumo-aval"><span class="big">' + num1(media) + '</span><span><span class="estr">' + estrelas(Math.round(media)) + '</span><br><small>' + prod.comentarios.length + ' avaliações</small></span></div>' + listaComent;

  const outras = catalogo.ofertasDoProduto(prod).filter(x => x !== o).sort((a, b) => a.preco - b.preco);
  const outrasHtml = outras.length ? '<div class="outras"><h3>Outras lojas com este produto</h3>' +
    outras.map((x, i) => '<div class="oferta-lin" data-idx="' + i + '"><div class="mini">' + ILUSTRACOES[x.produto.img] + '</div>' +
      '<div class="ol-nome">' + esc(x.loja.nome) + '<small>📍 ' + num1(x.loja.distanciaKm) + ' km · ' + esc(x.loja.endereco) + '</small></div>' +
      '<div class="ol-preco">' + fmt(x.preco) + '</div></div>').join("") + '</div>' : "";

  telas.produto.innerHTML =
    '<button class="voltar" id="btVoltar">← Voltar aos resultados</button>' +
    '<div class="det-img">' + ILUSTRACOES[prod.img] + '</div>' +
    '<p class="det-cat">' + esc(prod.categoria) + '</p>' +
    '<h2 class="det-titulo">' + esc(prod.nome) + '</h2>' +
    '<p class="det-aval">★ ' + num1(media) + ' <span class="qtd">(' + prod.comentarios.length + ' avaliações)</span></p>' +
    '<p class="det-preco">' + fmt(o.preco) + '</p>' +
    '<div class="secao"><h3>Vendido por</h3><p><b>' + esc(o.loja.nome) + '</b> · ★ ' + num1(o.loja.nota) + '</p>' +
      '<p class="local">📍 ' + esc(o.loja.endereco) + ' — a ' + num1(o.loja.distanciaKm) + ' km de você</p></div>' +
    '<div class="opcoes">' +
      '<div class="opcao"><h4>🏪 Retirar na loja</h4><p class="destaque">Retire hoje</p><p>' + esc(o.loja.endereco) + '</p><p>A ' + num1(o.loja.distanciaKm) + ' km (~' + o.tempoRetirada() + ')</p><p>Sem custo de entrega</p></div>' +
      '<div class="opcao"><h4>🚚 Receber em casa</h4><p class="destaque">Chega em ' + o.prazoEntrega() + '</p><p>Frete: ' + freteTxt + '</p>' +
        (frete === 0 ? '<p>Frete grátis acima de R$ 100</p>' : '<p>Calculado pela distância da loja</p>') + '</div>' +
    '</div>' +
    '<div class="acoes"><button class="comprar" id="btComprar">Comprar agora</button><button class="carrinho" id="btCarrinho">Adicionar ao carrinho</button></div>' +
    '<p class="explica">🛒 Cada compra é gravada no banco e passa a fazer parte do seu histórico — é esse dado que alimenta a recomendação da IA.</p>' +
    '<div class="abas"><button class="aba ativa" data-aba="desc">Descrição</button><button class="aba" data-aba="carac">Características</button><button class="aba" data-aba="aval">Avaliações (' + prod.comentarios.length + ')</button></div>' +
    '<div class="painel" id="painel-desc"><p class="secao" style="margin:0">' + esc(prod.descricao) + '</p></div>' +
    '<div class="painel oculto" id="painel-carac">' + tabelaCarac + '</div>' +
    '<div class="painel oculto" id="painel-aval">' + painelAval + '</div>' + outrasHtml;

  $("btVoltar").addEventListener("click", () => mostrar("lista"));
  $("btComprar").addEventListener("click", () => comprar(o));
  $("btCarrinho").addEventListener("click", () => toast("Item adicionado ao carrinho (simulação)."));
  telas.produto.querySelectorAll(".oferta-lin").forEach((el, i) => el.addEventListener("click", () => abrirProduto(outras[i])));
  telas.produto.querySelectorAll(".aba").forEach(b => b.addEventListener("click", () => {
    telas.produto.querySelectorAll(".aba").forEach(x => x.classList.remove("ativa"));
    telas.produto.querySelectorAll(".painel").forEach(x => x.classList.add("oculto"));
    b.classList.add("ativa"); telas.produto.querySelector("#painel-" + b.dataset.aba).classList.remove("oculto");
  }));
  mostrar("produto");
}

async function comprar(o) {
  const bt = $("btComprar"); bt.disabled = true; bt.textContent = "Registrando…";
  try {
    const r = await api("/api/compras", { method: "POST", body: JSON.stringify({ tutor_id: TUTOR_ID, oferta_id: o.id }) });
    const f = r.historico.features;
    toast("✅ Compra registrada em " + o.loja.nome + ". Histórico: " + r.historico.total_compras_janela + " compras nos últimos 90 dias (" + f.compras_mes + "/mês).", 4000);
  } catch (e) { toast("Erro ao registrar compra: " + e.message); }
  bt.disabled = false; bt.textContent = "Comprar agora";
}

/* ================= PERFIL (tutor + pet) ================= */
const PERFIL_PADRAO = { nome: "Ana Ribeiro", email: "ana.ribeiro@exemplo.com", telefone: "(19) 98888-0000", endereco: "Rua das Acácias, 300 · Centro",
  petNome: "Thor", especie: "cao", idade: 6, porte: "medio", raca: "", obs: "", cpf: "", foto: "🐶" };
const ehCliente = () => !!conta && conta.tipo === "cliente";
// Conta cliente: os dados vêm do banco (tutor + pet). No navegador fica só a foto escolhida.
// Modo demonstração (sem conta): tudo continua salvo no navegador, como antes.
const chavePerfil = () => conta ? "perfil:" + conta.id : "perfil";
function perfilDaConta(c) {
  const t = c.tutor, pt = c.pet || {};
  return { nome: t.nome, email: c.email, telefone: t.telefone || "", endereco: t.endereco || "", cpf: t.cpf || "",
    petNome: pt.nome || "", especie: pt.especie || "cao", idade: pt.idade_anos ?? 0, porte: pt.porte || "medio",
    raca: pt.raca || "", obs: pt.observacoes_saude || "", foto: pt.especie === "gato" ? "🐱" : "🐶" };
}
function lerPerfil() {
  const base = ehCliente() ? perfilDaConta(conta) : {};
  try { return { ...PERFIL_PADRAO, ...base, ...JSON.parse(localStorage.getItem(chavePerfil()) || "{}") }; } catch { return { ...PERFIL_PADRAO, ...base }; }
}
async function salvarPerfil(p) {
  if (ehCliente()) {
    const r = await api("/api/perfil", { method: "PUT", body: JSON.stringify({ nome: p.nome, telefone: p.telefone, endereco: p.endereco,
      pet: { nome: p.petNome, especie: p.especie, idade_anos: p.idade, porte: p.porte, raca: p.raca, observacoes_saude: p.obs } }) });
    conta = r.conta;
    try { localStorage.setItem(chavePerfil(), JSON.stringify({ foto: p.foto })); } catch {}
  } else {
    try { localStorage.setItem(chavePerfil(), JSON.stringify(p)); } catch {}
  }
  atualizarConta();
}
function atualizarConta() {
  const modo = document.body.dataset.modo;
  $("contaNome").textContent = conta && conta.tipo === "clinica" ? conta.clinica.nome : (lerPerfil().nome.split(" ")[0] || "Perfil");
  $("btSair").textContent = conta ? "Sair" : "Entrar";
  $("subtitulo").textContent = modo === "clinica" ? "Painel da clínica · indicadores agregados dos clientes"
    : "Produtos para o seu pet nas lojas mais perto de você";
}

function renderPerfil() {
  const p = lerPerfil();
  const opt = (v, atual, rotulo) => '<option value="' + v + '"' + (v === atual ? ' selected' : '') + '>' + rotulo + '</option>';
  const cli = ehCliente();
  telas.perfil.innerHTML =
    '<div class="perfil-topo"><div class="foto-perfil" id="fotoPet">' + p.foto + '</div><p>Toque na foto para trocar</p></div>' +
    (cli ? '<div class="aviso lgpd">🔒 <b>Dados fictícios.</b> CPF e informações de saúde deste projeto acadêmico são fictícios — não informe dados reais (LGPD).</div>'
         : '<div class="aviso lgpd">Você está no <b>modo demonstração</b>: o perfil fica salvo só neste navegador. <a href="#" id="lnkCriarConta">Crie uma conta</a> para salvar no banco.</div>') +
    '<div class="bloco"><h3>👤 Tutor</h3><div class="form-grid">' +
      '<div><label class="rotulo">Nome</label><input class="campo" id="pNome" value="' + esc(p.nome) + '"></div>' +
      '<div><label class="rotulo">E-mail' + (cli ? ' (login)' : '') + '</label><input class="campo" id="pEmail" value="' + esc(p.email) + '"' + (cli ? ' readonly' : '') + '></div>' +
      '<div><label class="rotulo">Telefone</label><input class="campo" id="pTel" value="' + esc(p.telefone) + '"></div>' +
      '<div><label class="rotulo">Endereço</label><input class="campo" id="pEnd" value="' + esc(p.endereco) + '"></div>' +
      (cli ? '<div><label class="rotulo">CPF (fictício)</label><input class="campo" value="' + esc(p.cpf) + '" readonly></div>' : '') + '</div></div>' +
    '<div class="bloco"><h3>🐾 Pet</h3><div class="form-grid">' +
      '<div><label class="rotulo">Nome do pet</label><input class="campo" id="pPet" value="' + esc(p.petNome) + '"></div>' +
      '<div><label class="rotulo">Espécie</label><select class="campo" id="pEsp">' + opt("cao", p.especie, "Cão") + opt("gato", p.especie, "Gato") + '</select></div>' +
      '<div><label class="rotulo">Idade (anos)</label><input class="campo" id="pIdade" type="number" min="0" max="25" step="0.5" value="' + p.idade + '"></div>' +
      '<div><label class="rotulo">Porte</label><select class="campo" id="pPorte">' + opt("pequeno", p.porte, "Pequeno") + opt("medio", p.porte, "Médio") + opt("grande", p.porte, "Grande") + '</select></div>' +
      '<div><label class="rotulo">Raça</label><input class="campo" id="pRaca" value="' + esc(p.raca) + '" placeholder="ex.: SRD, Labrador"></div></div>' +
      '<label class="rotulo">Problemas / observações de saúde (fictícios)</label><textarea class="campo" id="pObs" rows="2" placeholder="ex.: alergia alimentar, artrose">' + esc(p.obs) + '</textarea>' +
      '<p class="explica">Espécie, idade e porte entram como variáveis do modelo de recomendação.</p></div>' +
    htmlLocalizacao(renderPerfil) +
    '<div class="bloco" id="blocoHist"><h3>🛒 Histórico de compras <span class="rot-db">consulta ao banco</span></h3><p class="origem">últimos 90 dias · tabela compras do SQLite</p><p class="vazio-clin">Carregando…</p></div>' +
    '<button class="btn-prim" id="btSalvarPerfil">Salvar perfil</button>';

  $("fotoPet").addEventListener("click", () => { const f = ["🐶", "🐱", "🐕", "🐈", "🐾"]; p.foto = f[(f.indexOf(p.foto) + 1) % f.length]; $("fotoPet").textContent = p.foto; });
  $("pEsp").addEventListener("change", e => { if (e.target.value === "gato") $("pPorte").value = "pequeno"; });
  if ($("lnkCriarConta")) $("lnkCriarConta").addEventListener("click", ev => { ev.preventDefault(); abrirLogin("cadastro"); });
  $("btSalvarPerfil").addEventListener("click", async () => {
    try {
      await salvarPerfil({ nome: $("pNome").value, email: $("pEmail").value, telefone: $("pTel").value, endereco: $("pEnd").value,
        petNome: $("pPet").value, especie: $("pEsp").value, idade: parseFloat($("pIdade").value) || 0, porte: $("pPorte").value,
        raca: $("pRaca").value, obs: $("pObs").value, foto: p.foto });
      toast(ehCliente() ? "Perfil salvo no banco." : "Perfil salvo (persistido no navegador).");
    } catch (e) { toast("Não foi possível salvar: " + e.message, 4000); }
  });
  api("/api/tutores/" + TUTOR_ID + "/historico").then(h => {
    const f = h.features;
    const linhas = Object.keys(f).filter(k => k.startsWith("gasto_") && f[k] > 0).map(k => '<tr><td class="rot">' + k.replace("gasto_", "R$/mês em ") + '</td><td>' + fmt(f[k]) + '</td></tr>').join("");
    $("blocoHist").querySelector(".vazio-clin").outerHTML =
      '<table class="tabela"><tr><td class="rot">Compras na janela</td><td>' + h.total_compras_janela + ' (' + f.compras_mes + ' por mês)</td></tr>' + linhas + '</table>' +
      (h.recentes.length ? '<p class="explica">Últimas: ' + h.recentes.slice(0, 4).map(r => esc(r.nome) + ' (' + r.data + ')').join(' · ') + '</p>' : '');
  }).catch(() => { $("blocoHist").querySelector(".vazio-clin").innerHTML = MSG_SEM_API; });
}

/* ================= RECOMENDAÇÃO (IA + banco) ================= */
const SITUACOES = [
  ["checkup", "Consulta de rotina / check-up"], ["coceira", "Coceira, pele irritada"], ["mau_halito", "Mau hálito, tártaro"],
  ["mancando", "Mancando, dificuldade para andar"], ["ganho_peso", "Ganho de peso"], ["vomito", "Vômito ocasional"],
  ["engasgo", "Engasgo"], ["sangramento", "Sangramento / corte"], ["toxico", "Ingestão de algo tóxico"], ["convulsao", "Convulsão"], ["insolacao", "Superaquecimento (insolação)"],
];
const NOME_SIT = Object.fromEntries(SITUACOES);

function renderRecomendacao(situacaoInicial) {
  const p = lerPerfil();
  telas.recomendacao.innerHTML =
    '<h2 class="det-titulo">🤖 Que atendimento o ' + esc(p.petNome) + ' precisa?</h2>' +
    '<p class="secao" style="margin:6px 0 0">O modelo de IA combina o perfil do pet, a situação relatada e o <b>seu histórico de compras na loja</b> para indicar a especialidade veterinária. Depois, o banco lista as clínicas abertas.</p>' +
    '<div class="bloco"><div class="form-grid">' +
      '<div><label class="rotulo">Espécie</label><select class="campo" id="rEsp"><option value="cao"' + (p.especie === "cao" ? " selected" : "") + '>Cão</option><option value="gato"' + (p.especie === "gato" ? " selected" : "") + '>Gato</option></select></div>' +
      '<div><label class="rotulo">Idade (anos)</label><input class="campo" id="rIdade" type="number" min="0" max="25" step="0.5" value="' + p.idade + '"></div>' +
      '<div><label class="rotulo">Porte</label><select class="campo" id="rPorte">' + ["pequeno", "medio", "grande"].map(v => '<option value="' + v + '"' + (v === p.porte ? " selected" : "") + '>' + v[0].toUpperCase() + v.slice(1) + '</option>').join("") + '</select></div>' +
      '<div><label class="rotulo">Horário da consulta</label><input class="campo" id="rHora" type="time" value="' + horaAgora() + '"></div>' +
    '</div>' +
    '<label class="rotulo">Situação do pet</label><select class="campo" id="rSit">' + SITUACOES.map(([v, r]) => '<option value="' + v + '"' + (v === situacaoInicial ? " selected" : "") + '>' + r + '</option>').join("") + '</select>' +
    '<button class="btn-prim" id="btRecomendar">Pedir recomendação</button></div>' +
    '<div id="resRec"></div>';
  $("btRecomendar").addEventListener("click", pedirRecomendacao);
}

async function pedirRecomendacao() {
  const bt = $("btRecomendar"), res = $("resRec");
  bt.disabled = true; bt.textContent = "Consultando o modelo…";
  const corpo = { tutor_id: TUTOR_ID, especie: $("rEsp").value, idade_anos: parseFloat($("rIdade").value) || 0, porte: $("rPorte").value, situacao: $("rSit").value, hora: $("rHora").value || horaAgora(), ...corpoPos() };
  await posicaoTutor().catch(() => {});
  try {
    const r = await api("/api/recomendar", { method: "POST", body: JSON.stringify(corpo) });
    res.innerHTML = htmlIA(r.ia, corpo) + htmlClinicas(r.banco) + htmlRodapeModelo();
    if (r.banco.clinicas.length) montarMapa($("mapaRec"), r.banco.clinicas, { compacto: true });
  } catch (e) {
    res.innerHTML = '<div class="aviso-erro">' + (e.message.startsWith("HTTP") || e.message.includes("fetch") ? MSG_SEM_API : esc(e.message)) + '</div>';
  }
  bt.disabled = false; bt.textContent = "Pedir recomendação";
  res.scrollIntoView({ behavior: "smooth", block: "start" });
}

function htmlIA(ia, corpo) {
  const f = ia.features_usadas;
  const gastos = Object.keys(f).filter(k => k.startsWith("gasto_")).sort((a, b) => f[b] - f[a]).slice(0, 4).filter(k => f[k] > 0)
    .map(k => k.replace("gasto_", "") + " " + fmt(f[k]) + "/mês").join(" · ");
  const barras = ia.probabilidades.map((x, i) => '<div class="barra-prob' + (i === 0 ? " top" : "") + '"><span>' + esc(x.nome.split(" (")[0]) + '</span><div class="trilho"><div class="fill" style="width:' + (x.p * 100) + '%"></div></div><span class="pct">' + pct(x.p) + '</span></div>').join("");
  return '<div class="bloco"><h3>Especialidade indicada <span class="rot-ia">IA · Random Forest</span></h3><p class="origem">' + esc(ia.origem) + '</p>' +
    '<div class="resultado"><span class="big">' + esc(ia.especialidade_nome) + '</span><span class="conf">confiança ' + pct(ia.confianca) + '</span></div>' +
    '<div class="barras">' + barras + '</div>' +
    '<p class="explica"><b>O que o modelo recebeu:</b> ' + (corpo.especie === "cao" ? "cão" : "gato") + ', ' + corpo.idade_anos + ' anos, porte ' + corpo.porte + ', situação “' + esc(NOME_SIT[corpo.situacao] || corpo.situacao) + '”; ' +
    'do banco: ' + ia.historico_compras.total_compras_janela + ' compras em ' + ia.historico_compras.janela_dias + ' dias (' + f.compras_mes + '/mês)' + (gastos ? ' — ' + gastos : '') + '.</p></div>';
}

function htmlClinicas(b) {
  const lista = b.clinicas.length ? b.clinicas.map(c =>
    '<div class="clinica"><div class="cl-info"><span class="cl-nome">' + esc(c.nome) + '</span>' +
    '<small>📍 ' + esc(c.endereco) + ' — ' + num1(c.distancia_km) + ' km</small><small>' + (c.telefone ? '📞 ' + esc(c.telefone) + ' · ' : '') + '🕒 ' + esc(txtHorario(c)) + '</small></div>' +
    (c.aberta_agora === true ? '<span class="tag24">' + (c.aberto_24h ? '24h' : 'aberta') + '</span>' : '<span class="tagoff">horário ?</span>') + '</div>').join("") :
    '<p class="vazio-clin">Nenhuma clínica encontrada para esse filtro às ' + b.hora_consultada + '. Tente outro horário, aumente o raio na aba Mapa ou veja as clínicas de emergência.</p>';
  const fonte = b.fonte === "osm" ? '<span class="rot-ok">dados reais · OpenStreetMap</span>' : '<span class="rot-demo">dados de demonstração</span>';
  return '<div class="bloco"><h3>Clínicas abertas às ' + b.hora_consultada + ' <span class="rot-db">consulta a dados</span> ' + fonte + '</h3>' +
    '<p class="origem">filtro: especialidade = ' + esc(b.especialidade_filtrada) + ' e horário de funcionamento · ' + esc(b.origem) + '</p>' +
    (b.aviso ? '<div class="aviso" style="margin-bottom:10px">' + esc(b.aviso) + '</div>' : '') +
    (!temPosicaoReal() ? '<p class="explica" style="margin:0 0 10px">Para ver clínicas reais perto de você, defina sua localização na aba <b>🗺️ Mapa</b>.</p>' : '') +
    (b.clinicas.length ? '<div id="mapaRec" class="mapa compacto"></div><p class="explica" style="margin-top:6px">📍 Toque em uma clínica no mapa para ver telefone, horário e a rota.</p>' : '') + lista + '</div>';
}

function htmlRodapeModelo() {
  if (!metricasModelo) return "";
  const m = metricasModelo;
  return '<p class="rodape-modelo">Modelo: ' + esc(m.algoritmo) + ' · treinado com ' + m.n_linhas + ' linhas sintéticas · acurácia no teste ' + pct(m.acuracia) + ' (validação cruzada ' + pct(m.cv_media) + ')</p>';
}

/* ================= EMERGÊNCIA (primeiros socorros + clínicas) ================= */
const vetFamilia = { nome: "Dra. Marina Alves", clinica: "Clínica VidaPet", telefone: "(19) 99999-0001", distanciaKm: 0.6 };
const primeirosSocorros = [
  { id: "engasgo", icone: "😮‍💨", titulo: "Engasgo",
    passos: ["Mantenha a calma e contenha o animal com cuidado para não se machucar.", "Abra a boca e verifique se o objeto está visível; retire apenas se conseguir alcançá-lo sem empurrar.", "Em cães pequenos, segure-o de cabeça para baixo por instantes; em cães grandes, eleve as patas traseiras.", "Se não resolver em segundos, leve imediatamente ao veterinário."],
    alerta: "Não coloque a mão fundo na garganta às cegas — você pode empurrar o objeto ainda mais." },
  { id: "sangramento", icone: "🩹", titulo: "Sangramento / corte",
    passos: ["Pressione o local com um pano limpo ou gaze por alguns minutos.", "Se encharcar, não retire o pano: coloque outro por cima e continue pressionando.", "Mantenha o animal o mais calmo e imóvel possível.", "Procure atendimento se o sangramento for intenso ou não parar."], alerta: "" },
  { id: "toxico", icone: "☠️", titulo: "Ingestão de algo tóxico",
    passos: ["Afaste o animal da substância e tente identificar o que foi ingerido.", "NÃO induza o vômito sem orientação do veterinário.", "Guarde a embalagem ou o rótulo do produto para mostrar ao profissional.", "Ligue para o veterinário ou vá à clínica imediatamente."],
    alerta: "Alguns produtos causam mais dano se vomitados — só induza o vômito se o veterinário orientar." },
  { id: "convulsao", icone: "⚡", titulo: "Convulsão",
    passos: ["Afaste móveis e objetos ao redor para o animal não se machucar.", "Não coloque a mão na boca dele.", "Observe e anote quanto tempo dura a crise.", "Depois da crise, deixe-o em ambiente calmo e procure o veterinário."], alerta: "" },
  { id: "insolacao", icone: "🌡️", titulo: "Superaquecimento (insolação)",
    passos: ["Leve o animal para um local fresco e à sombra.", "Molhe o corpo com água em temperatura ambiente (nunca gelada).", "Ofereça água fresca em pequena quantidade.", "Procure o veterinário — insolação é uma emergência."],
    alerta: "Água muito gelada pode causar choque térmico; use água natural." },
];
const tEmg = telas.emergencia;

function wireEmg() {
  const bv = $("btVoltarEmg"); if (bv) bv.addEventListener("click", renderEmergenciaHome);
  tEmg.querySelectorAll("[data-clinicas]").forEach(b => b.addEventListener("click", renderClinicasEmergencia));
  tEmg.querySelectorAll("[data-sos]").forEach(b => b.addEventListener("click", renderSOS));
  tEmg.querySelectorAll("[data-rec]").forEach(b => b.addEventListener("click", () => { mostrar("recomendacao"); renderRecomendacao(b.dataset.rec); }));
}

function renderEmergenciaHome() {
  tEmg.innerHTML =
    '<div class="aviso">⚠️ As orientações abaixo são educativas e não substituem o atendimento veterinário. Em caso de emergência, procure um profissional.</div>' +
    '<div class="sos-card"><h3>🚑 Emergência veterinária</h3><p>Seu pet está passando mal? Acione o veterinário da família ou encontre a clínica mais próxima.</p>' +
      '<button class="btn-sos" data-sos>Acionar veterinário da família</button><button class="btn-sec" data-clinicas>Ver clínicas próximas</button></div>' +
    '<h3 class="emg-h3">Primeiros socorros — o que fazer</h3><div class="sit-lista">' +
      primeirosSocorros.map(s => '<div class="sit-item" data-id="' + s.id + '"><span class="ic">' + s.icone + '</span><span class="nm">' + s.titulo + '</span></div>').join('') + '</div>';
  wireEmg();
  tEmg.querySelectorAll(".sit-item").forEach(el => el.addEventListener("click", () => renderSituacao(el.dataset.id)));
}

function renderSituacao(id) {
  const s = primeirosSocorros.find(x => x.id === id);
  tEmg.innerHTML =
    '<button class="voltar" id="btVoltarEmg">← Voltar</button><h2 class="det-titulo">' + s.icone + ' ' + s.titulo + '</h2>' +
    '<ol class="passos">' + s.passos.map(p => '<li>' + p + '</li>').join('') + '</ol>' +
    (s.alerta ? '<div class="alerta-passo">⚠️ ' + s.alerta + '</div>' : '') +
    '<button class="btn-sos" data-sos style="margin-top:18px">Acionar veterinário da família</button>' +
    '<button class="btn-sec" data-rec="' + s.id + '">🤖 Ver recomendação da IA para esta situação</button>' +
    '<button class="btn-sec" data-clinicas>Ver clínicas próximas</button>';
  wireEmg();
}

function renderSOS() {
  const p = lerPerfil();
  tEmg.innerHTML =
    '<button class="voltar" id="btVoltarEmg">← Voltar</button><h2 class="det-titulo">🚑 Acionar veterinário</h2>' +
    '<p class="secao" style="margin:8px 0 0">Envie um alerta para <b>' + vetFamilia.nome + '</b> (' + vetFamilia.clinica + ') com as primeiras informações. Ela poderá ir até você.</p>' +
    '<label class="rotulo">Nome do pet</label><input class="campo" id="fPet" value="' + esc(p.petNome) + '">' +
    '<label class="rotulo">Espécie</label><select class="campo" id="fEspecie"><option' + (p.especie === "cao" ? " selected" : "") + '>Cão</option><option' + (p.especie === "gato" ? " selected" : "") + '>Gato</option><option>Outro</option></select>' +
    '<label class="rotulo">Situação</label><select class="campo" id="fSituacao">' + primeirosSocorros.map(s => '<option>' + s.titulo + '</option>').join('') + '<option>Outra</option></select>' +
    '<label class="rotulo">Observações</label><textarea class="campo" id="fObs" rows="3" placeholder="Descreva rapidamente o que está acontecendo"></textarea>' +
    '<button class="btn-sos" id="btEnviar" style="margin-top:16px">Enviar alerta</button><button class="btn-sec" data-clinicas>Prefiro levar — ver clínicas próximas</button>';
  wireEmg(); $("btEnviar").addEventListener("click", enviarSOS);
}

function enviarSOS() {
  const pet = $("fPet").value || "Seu pet", esp = $("fEspecie").value, sit = $("fSituacao").value, obs = $("fObs").value || "—";
  const tempo = Math.round(10 + vetFamilia.distanciaKm * 4);
  tEmg.innerHTML =
    '<div class="confirma"><div class="check">✅</div><h3>Alerta enviado</h3><p class="secao" style="margin:0 auto;max-width:440px"><b>' + vetFamilia.nome + '</b> (' + vetFamilia.clinica + ') foi notificada e está a caminho.<br>Chegada estimada: ~' + tempo + ' min.</p></div>' +
    '<div class="secao"><h3>Informações enviadas ao veterinário</h3><table class="tabela"><tr><td class="rot">Pet</td><td>' + esc(pet) + ' (' + esc(esp) + ')</td></tr><tr><td class="rot">Situação</td><td>' + esc(sit) + '</td></tr><tr><td class="rot">Observações</td><td>' + esc(obs) + '</td></tr></table></div>' +
    '<button class="btn-sec" data-clinicas>Caso não seja possível, ver clínicas próximas</button><button class="btn-sec" id="btVoltarEmg">Voltar ao início</button>';
  wireEmg();
}

async function renderClinicasEmergencia() {
  const hora = horaAgora();
  tEmg.innerHTML = '<button class="voltar" id="btVoltarEmg">← Voltar</button><h2 class="det-titulo">🏥 Clínicas de emergência abertas agora <span class="rot-db">consulta ao banco</span></h2>' +
    '<p class="secao" style="margin:8px 0 14px">Filtro: especialidade “emergencia”, abertas às ' + hora + ', ordenadas pela distância.</p><div id="mapaEmg" class="mapa compacto"></div><div id="listaClin" style="margin-top:12px"><p class="vazio-clin">Carregando…</p></div>';
  wireEmg();
  try {
    await posicaoTutor();
    let r = await api("/api/clinicas?meta=1&especialidade=emergencia&hora=" + hora + "&so_abertas=1" + paramsPos());
    if (r.meta.fonte === "osm" && !r.clinicas.length) r = await api("/api/clinicas?meta=1&hora=" + hora + "&so_abertas=1" + paramsPos());  // sem "emergência" no nome: mostra todas
    const cl = r.clinicas;
    montarMapa($("mapaEmg"), cl, { compacto: true });
    $("listaClin").innerHTML = (r.meta.aviso ? '<div class="aviso" style="margin-bottom:10px">' + esc(r.meta.aviso) + '</div>' : '') +
      '<p class="origem">' + (r.meta.fonte === "osm" ? 'dados reais · OpenStreetMap · raio ' + r.meta.raio_km + ' km' : 'dados de demonstração — defina sua localização na aba Mapa') + '</p>' +
      cl.map(c => '<div class="clinica"><div class="cl-info"><span class="cl-nome">' + esc(c.nome) + (c.fonte === "demo" && c.id === 1 ? ' · sua clínica' : '') + '</span>' +
      '<small>📍 ' + esc(c.endereco) + ' — ' + num1(c.distancia_km) + ' km</small><small>' + (c.telefone ? '📞 <a href="tel:' + esc(c.telefone.replace(/\s/g, "")) + '">' + esc(c.telefone) + '</a> · ' : '') + '🕒 ' + esc(txtHorario(c)) + '</small></div>' +
      (c.aberta_agora === true ? '<span class="tag24">' + (c.aberto_24h ? '24h' : 'aberta') + '</span>' : '<span class="tagoff">horário ?</span>') + '</div>').join('');
  } catch { $("listaClin").innerHTML = '<div class="aviso-erro">' + MSG_SEM_API + '</div>'; }
}

/* ================= MAPA (Leaflet + OpenStreetMap) ================= */
/* As coordenadas vêm do banco (tabelas clinicas e tutores). O mapa é visualização:
   o filtro "quem está aberta / qual especialidade" continua sendo consulta SQL. */
/* Posição do usuário: GPS do navegador ou endereço geocodificado (Nominatim), guardada no
   navegador. Com posição real, as clínicas vêm do OpenStreetMap; sem ela, dados de demonstração. */
let tutorPos = null;            // posição em uso no mapa (real ou demo)
let raioKm = 5;
function lerPosicao() { try { return JSON.parse(localStorage.getItem("posicao") || "null"); } catch { return null; } }
function salvarPosicao(p) { try { if (p) localStorage.setItem("posicao", JSON.stringify(p)); else localStorage.removeItem("posicao"); } catch {} tutorPos = p ? { ...p } : null; }
const temPosicaoReal = () => !!lerPosicao();
const paramsPos = () => { const p = lerPosicao(); return p ? "&lat=" + p.lat + "&lon=" + p.lon + "&raio_km=" + raioKm : ""; };
const corpoPos = () => { const p = lerPosicao(); return p ? { lat: p.lat, lon: p.lon, raio_km: raioKm } : {}; };

async function posicaoTutor() {
  const real = lerPosicao();
  if (real) { tutorPos = { ...real }; return tutorPos; }
  if (!tutorPos) { const t = await api("/api/tutores/" + TUTOR_ID); tutorPos = { lat: t.lat, lon: t.lon, rotulo: t.endereco + " (demonstração)", fonte: "demo" }; }
  return tutorPos;
}

function usarGPS(aoTerminar) {
  if (!navigator.geolocation) { toast("Seu navegador não oferece geolocalização. Digite um endereço."); return; }
  toast("Obtendo sua localização…");
  navigator.geolocation.getCurrentPosition(async pos => {
    const p = { lat: +pos.coords.latitude.toFixed(6), lon: +pos.coords.longitude.toFixed(6), fonte: "gps", rotulo: "Minha localização (GPS)", precisao_m: Math.round(pos.coords.accuracy) };
    salvarPosicao(p); toast("📍 Localização obtida (precisão ~" + p.precisao_m + " m). Buscando clínicas reais…");
    aoTerminar && aoTerminar();
  }, err => {
    toast(err.code === 1 ? "Permissão de localização negada. Digite um endereço abaixo." : "Não foi possível obter a localização (" + err.message + "). Digite um endereço.", 4500);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

async function usarEndereco(q, aoTerminar) {
  if (!q || q.trim().length < 3) { toast("Digite um endereço ou cidade."); return; }
  try {
    const r = await api("/api/geocodificar?q=" + encodeURIComponent(q.trim()));
    salvarPosicao({ lat: r.lat, lon: r.lon, fonte: "endereco", rotulo: r.rotulo });
    toast("📍 " + r.rotulo.split(",").slice(0, 3).join(","), 3500);
    aoTerminar && aoTerminar();
  } catch (e) { toast("Endereço não encontrado: " + e.message, 4000); }
}

function htmlLocalizacao(aoMudar) {
  const p = lerPosicao();
  const html = '<div class="bloco loc"><h3>📍 Sua localização ' + (p ? '<span class="rot-ok">real · ' + (p.fonte === "gps" ? "GPS" : "endereço") + '</span>' : '<span class="rot-demo">demonstração</span>') + '</h3>' +
    '<p class="origem">' + (p ? esc(p.rotulo) + ' · ' + p.lat + ', ' + p.lon : 'Nenhuma localização definida: o mapa usa um endereço fictício em Sumaré-SP e clínicas de demonstração.') + '</p>' +
    '<div class="mapa-filtros"><button class="btn-sec" id="btGPS">📡 Usar meu GPS</button>' +
    '<div class="grupo-end"><input class="campo" id="inEnd" placeholder="ou digite endereço / cidade"><button class="btn-sec" id="btEnd">Definir</button></div>' +
    (p ? '<button class="btn-sec" id="btLimparPos" title="Voltar aos dados de demonstração">✕</button>' : '') + '</div></div>';
  setTimeout(() => {
    const g = $("btGPS"), e = $("btEnd"), i = $("inEnd"), l = $("btLimparPos");
    if (g) g.onclick = () => usarGPS(aoMudar);
    if (e) e.onclick = () => usarEndereco(i.value, aoMudar);
    if (i) i.onkeydown = ev => { if (ev.key === "Enter") usarEndereco(i.value, aoMudar); };
    if (l) l.onclick = () => { salvarPosicao(null); tutorPos = null; toast("Voltando aos dados de demonstração."); aoMudar(); };
  }, 0);
  return html;
}
const pin = (emoji, classe) => L.divIcon({ className: "pin " + (classe || ""), html: emoji, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] });
const linkRota = c => tutorPos ? '<a href="https://www.google.com/maps/dir/?api=1&origin=' + tutorPos.lat + ',' + tutorPos.lon + '&destination=' + c.lat + ',' + c.lon + '&travelmode=driving" target="_blank" rel="noopener">🚗 Como chegar</a>' : '';

const txtHorario = c => c.aberto_24h ? 'aberta 24h' : (c.horario_texto || (c.abre ? c.abre + '–' + c.fecha : 'horário não informado'));
const txtAberta = c => c.aberta_agora === true ? ' · <span style="color:#12805c">aberta agora</span>' : c.aberta_agora === false ? ' · <span style="color:#b23636">fechada agora</span>' : '';
function popupClinica(c) {
  return '<b>' + esc(c.nome) + '</b><br>📍 ' + esc(c.endereco) + ' — <b>' + num1(c.distancia_km) + ' km</b>' +
    (c.telefone ? '<br>📞 <a href="tel:' + esc(c.telefone.replace(/\s/g, "")) + '">' + esc(c.telefone) + '</a>' : '') +
    (c.site ? '<br>🌐 <a href="' + esc(c.site) + '" target="_blank" rel="noopener">site</a>' : '') +
    '<br>🕒 ' + esc(txtHorario(c)) + txtAberta(c) +
    '<br>🩺 ' + c.especialidades.map(e => ESPECIALIDADES_NOMES[e] || e).join(", ") + (c.especialidade_inferida ? ' <small>(inferida pelo nome)</small>' : '') +
    '<br>' + linkRota(c) + (c.osm_url ? ' · <a href="' + esc(c.osm_url) + '" target="_blank" rel="noopener">ver no OSM</a>' : '');
}

function montarMapa(el, clinicas, opcoes = {}) {
  if (!el || typeof L === "undefined") return null;
  if (el._mapa) { el._mapa.remove(); el._mapa = null; }
  el.classList.remove("sem-tiles");
  const m = L.map(el, { scrollWheelZoom: false });
  el._mapa = m; el._marcadores = {};
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
    .on("tileerror", () => el.classList.add("sem-tiles")).addTo(m);
  const pontos = [];
  if (tutorPos) {
    const p = [tutorPos.lat, tutorPos.lon]; pontos.push(p);
    L.marker(p, { icon: pin("📍", "voce"), zIndexOffset: 1000 }).addTo(m).bindPopup("<b>Você está aqui</b><br>" + esc(tutorPos.rotulo || lerPerfil().endereco));
    [1, 2].forEach(km => L.circle(p, { radius: km * 1000, color: "#1c62c4", weight: 2, dashArray: "6 6", fill: false, opacity: .75 }).addTo(m));
  }
  clinicas.forEach(c => {
    const p = [c.lat, c.lon]; pontos.push(p);
    const fechada = c.aberta_agora === false;
    if (!c.lat || !c.lon) return;
    const mk = L.marker(p, { icon: pin("🏥", (fechada ? "fechada" : "") + (c.id === opcoes.destaque ? " destaque" : "")) }).addTo(m).bindPopup(popupClinica(c));
    el._marcadores[c.id] = mk;
  });
  if (pontos.length) m.fitBounds(pontos, { padding: [36, 36], maxZoom: 15 }); else m.setView([-22.8219, -47.2669], 14);
  return m;
}

const ESPECIALIDADES_NOMES = { emergencia: "Emergência", dermatologia: "Dermatologia", odontologia: "Odontologia", ortopedia: "Ortopedia", nutricao: "Nutrição", clinico_geral: "Clínico geral" };

function renderMapa() {
  telas.mapa.innerHTML =
    '<h2 class="det-titulo">🗺️ Clínicas perto de você <span class="rot-db">consulta ao banco</span></h2>' +
    '<p class="secao" style="margin:6px 0 0">Com a sua localização, as clínicas vêm do <b>OpenStreetMap</b> (dados reais, mantidos por voluntários). Os filtros são consulta a dados — o mapa só desenha o resultado.</p>' +
    htmlLocalizacao(atualizarMapa) +
    '<div class="bloco"><div class="mapa-filtros">' +
      '<div style="flex:0 0 110px"><label class="rotulo" style="margin-top:0">Raio</label><select class="campo" id="mRaio">' + [2, 5, 10, 20].map(r => '<option value="' + r + '"' + (r === raioKm ? ' selected' : '') + '>' + r + ' km</option>').join("") + '</select></div>' +
      '<div><label class="rotulo" style="margin-top:0">Especialidade</label><select class="campo" id="mEsp"><option value="">Todas</option>' + Object.entries(ESPECIALIDADES_NOMES).map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join("") + '</select></div>' +
      '<div><label class="rotulo" style="margin-top:0">Horário</label><input class="campo" id="mHora" type="time" value="' + horaAgora() + '"></div>' +
      '<div style="flex:0 0 auto"><label class="rotulo" style="margin-top:0">&nbsp;</label><label class="campo" style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="mAbertas" checked> só abertas</label></div>' +
    '</div>' +
    '<div id="mapaGeral" class="mapa"></div>' +
    '<div class="leg"><span class="l-voce">você</span><span class="l-aberta">clínica aberta</span><span class="l-fechada">clínica fechada</span><span class="l-anel">anéis de 1 km e 2 km</span></div></div>' +
    '<div id="mapaLista" style="margin-top:14px"><p class="vazio-clin">Carregando…</p></div>';
  ["mEsp", "mHora", "mAbertas"].forEach(id => $(id).addEventListener("change", atualizarMapa));
  $("mRaio").addEventListener("change", () => { raioKm = +$("mRaio").value; atualizarMapa(); });
  atualizarMapa();
}

async function atualizarMapa() {
  if (!$("mEsp")) return;
  const esp = $("mEsp").value, hora = $("mHora").value || horaAgora(), soAbertas = $("mAbertas").checked;
  const lista = $("mapaLista");
  const blocoLoc = telas.mapa.querySelector(".bloco.loc"); if (blocoLoc) blocoLoc.outerHTML = htmlLocalizacao(atualizarMapa);
  lista.innerHTML = '<p class="vazio-clin">Buscando clínicas' + (temPosicaoReal() ? ' reais no OpenStreetMap (raio ' + raioKm + ' km)' : '') + '…</p>';
  try {
    await posicaoTutor();
    const r = await api("/api/clinicas?meta=1&hora=" + hora + (esp ? "&especialidade=" + esp : "") + paramsPos());
    const todas = r.clinicas, meta = r.meta;
    const mostradas = soAbertas ? todas.filter(c => c.aberta_agora !== false) : todas;
    const mapa = montarMapa($("mapaGeral"), mostradas);
    const fonte = meta.fonte === "osm" ? '<span class="rot-ok">dados reais · OpenStreetMap</span>' : '<span class="rot-demo">dados de demonstração</span>';
    lista.innerHTML = (meta.aviso ? '<div class="aviso" style="margin-bottom:10px">' + esc(meta.aviso) + '</div>' : '') +
      '<p class="info" style="padding:0 0 8px">' + mostradas.length + ' clínica(s)' + (esp ? ' de ' + ESPECIALIDADES_NOMES[esp] : '') + (soAbertas ? ' abertas (ou sem horário informado) às ' + hora : '') + (meta.fonte === "osm" ? ' num raio de ' + meta.raio_km + ' km' : '') + ', da mais perto para a mais longe · ' + fonte + '</p>' +
      (mostradas.length ? mostradas.map(c => '<div class="clinica' + (c.aberta_agora ? '' : ' fechada-lin') + '" data-id="' + c.id + '"><div class="cl-info"><span class="cl-nome">' + esc(c.nome) + '</span>' +
        '<small>📍 ' + esc(c.endereco) + ' — <b>' + num1(c.distancia_km) + ' km</b>' + (c.telefone ? ' · 📞 ' + esc(c.telefone) : '') + '</small><small>🩺 ' + c.especialidades.map(e => ESPECIALIDADES_NOMES[e] || e).join(", ") + (c.especialidade_inferida ? '*' : '') + ' · 🕒 ' + esc(txtHorario(c)) + '</small></div>' +
        (c.aberta_agora === true ? '<span class="tag24">' + (c.aberto_24h ? '24h' : 'aberta') + '</span>' : c.aberta_agora === false ? '<span class="tagoff">fechada</span>' : '<span class="tagoff">horário ?</span>') + '</div>').join("") +
        (mostradas.some(c => c.especialidade_inferida) ? '<p class="explica">* Especialidade inferida pelo nome da clínica (o OpenStreetMap não registra especialidades). Confirme por telefone.</p>' : '') :
        '<p class="vazio-clin">Nenhuma clínica com esse filtro. Desmarque "só abertas" ou mude o horário.</p>');
    lista.querySelectorAll(".clinica").forEach(el => el.addEventListener("click", () => {
      lista.querySelectorAll(".clinica").forEach(x => x.classList.remove("sel")); el.classList.add("sel");
      const mk = $("mapaGeral")._marcadores[el.dataset.id];
      if (mk && mapa) { mapa.setView(mk.getLatLng(), 16, { animate: true }); mk.openPopup(); $("mapaGeral").scrollIntoView({ behavior: "smooth", block: "center" }); }
    }));
  } catch (e) { lista.innerHTML = '<div class="aviso-erro">' + MSG_SEM_API + '</div>'; }
}

/* ================= CONTAS (login de demonstração) =================
   Dois tipos: cliente (tutor + pet) e clínica. A API guarda só o hash da senha
   e mantém a sessão num cookie (flask.session). */
// modo da interface (atributo data-modo no <body>, usado pelo CSS):
//   anon = tela de login · visitante = app sem conta (tutor demo) · cliente · clinica
function aplicarConta(c, modo) {
  conta = c;
  TUTOR_ID = c && c.tipo === "cliente" ? c.tutor.id : 1;
  tutorPos = null;                       // a posição demo depende do tutor
  document.body.dataset.modo = modo || (c ? c.tipo : "visitante");
  atualizarConta();
}

function abrirLogin(aba) { aplicarConta(null, "anon"); mostrar("login"); renderLogin(aba); }

async function sair() {
  try { await api("/api/logout", { method: "POST" }); } catch {}
  history.replaceState(null, "", location.pathname);
  abrirLogin("entrar");
  toast("Você saiu da conta.");
}

function entrarComConta(c, msg) {
  aplicarConta(c);
  history.replaceState(null, "", location.pathname);
  if (c.tipo === "clinica") { mostrar("painel"); renderPainel(); }
  else { mostrar("lista"); if (catalogo.ofertas.length) render(); }
  toast(msg);
}

// CPF FICTÍCIO com dígitos verificadores válidos — para testar o cadastro sem usar dado real.
function cpfFicticio() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const ini of [10, 11]) n.push((n.reduce((s, d, i) => s + d * (ini - i), 0) * 10 % 11) % 10);
  const d = n.join("");
  return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
}
const mascaraCpf = v => { const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2"); };

const AVISO_LGPD = '<div class="aviso lgpd">🔒 <b>Projeto acadêmico — use apenas dados fictícios.</b> CPF e informações de saúde do pet são dados pessoais/sensíveis (LGPD): não informe dados reais. A senha é guardada só como hash.</div>';

function renderLogin(aba = "entrar", tipo = "cliente") {
  const campo = (id, rotulo, extra = "") => '<div><label class="rotulo" for="' + id + '">' + rotulo + '</label><input class="campo" id="' + id + '" ' + extra + '></div>';
  const acesso = '<div class="bloco"><h3>🔐 Acesso</h3><div class="form-grid">' +
    campo("cEmail", "E-mail", 'type="email" autocomplete="email" placeholder="voce@exemplo.com"') +
    campo("cSenha", "Senha (mín. 6 caracteres)", 'type="password" autocomplete="new-password"') + '</div></div>';
  const formCliente =
    '<div class="bloco"><h3>👤 Seus dados</h3><div class="form-grid">' +
      campo("cNome", "Nome completo", 'autocomplete="name"') +
      '<div><label class="rotulo" for="cCpf">CPF (fictício)</label><div class="campo-acao"><input class="campo" id="cCpf" inputmode="numeric" placeholder="000.000.000-00"><button type="button" class="btn-sec" id="btCpf" title="Gerar um CPF fictício">Gerar</button></div></div>' +
      campo("cTel", "Telefone", 'placeholder="(19) 90000-0000"') + campo("cEnd", "Endereço", 'placeholder="Rua, número · bairro"') + '</div></div>' +
    '<div class="bloco"><h3>🐾 Seu pet</h3><div class="form-grid">' +
      campo("cPet", "Nome do pet") +
      '<div><label class="rotulo" for="cEsp">Espécie</label><select class="campo" id="cEsp"><option value="cao">Cão</option><option value="gato">Gato</option></select></div>' +
      campo("cRaca", "Raça", 'placeholder="ex.: SRD, Labrador, Siamês"') +
      campo("cIdade", "Idade (anos)", 'type="number" min="0" max="30" step="0.5" value="3"') +
      '<div><label class="rotulo" for="cPorte">Porte</label><select class="campo" id="cPorte"><option value="pequeno">Pequeno</option><option value="medio" selected>Médio</option><option value="grande">Grande</option></select></div></div>' +
      '<label class="rotulo" for="cObs">Possíveis problemas / observações de saúde (fictícios)</label><textarea class="campo" id="cObs" rows="2" placeholder="ex.: alergia alimentar, artrose, otite recorrente"></textarea></div>';
  const formClinica =
    '<div class="bloco"><h3>🏥 Dados da clínica</h3><div class="form-grid">' +
      campo("kNome", "Nome da clínica") + campo("kTel", "Telefone", 'placeholder="(19) 3000-0000"') + '</div>' +
      '<label class="rotulo" for="kEnd">Endereço</label><input class="campo" id="kEnd" placeholder="Rua, número · bairro">' +
      '<div class="form-grid">' + campo("kAbre", "Abre às", 'type="time" value="08:00"') + campo("kFecha", "Fecha às", 'type="time" value="18:00"') + '</div>' +
      '<label class="chk"><input type="checkbox" id="k24"> Atendimento 24 horas</label>' +
      '<span class="rotulo">Especialidades</span><div class="chk-grupo">' +
        Object.entries(ESPECIALIDADES_NOMES).map(([v, n]) => '<label class="chk"><input type="checkbox" name="kEsp" value="' + v + '"' + (v === "clinico_geral" ? " checked" : "") + '> ' + n + '</label>').join("") + '</div>' +
      '<p class="explica">A clínica aparece na lista de clínicas de demonstração (posição fictícia na cidade do demo).</p></div>';

  telas.login.innerHTML =
    '<div class="auth-topo"><div class="auth-logo">🐾</div><h2>Bem-vindo ao PatasPerto</h2><p>Entre com sua conta de <b>tutor</b> ou de <b>clínica</b>.</p></div>' +
    '<div class="abas auth-abas"><button class="aba' + (aba === "entrar" ? " ativa" : "") + '" data-aba="entrar">Entrar</button>' +
      '<button class="aba' + (aba === "cadastro" ? " ativa" : "") + '" data-aba="cadastro">Criar conta</button></div>' +
    (aba === "entrar"
      ? '<div class="bloco"><label class="rotulo" for="lEmail">E-mail</label><input class="campo" id="lEmail" type="email" autocomplete="username">' +
          '<label class="rotulo" for="lSenha">Senha</label><input class="campo" id="lSenha" type="password" autocomplete="current-password">' +
          '<button class="btn-prim" id="btEntrar">Entrar</button><div id="authErro"></div></div>' +
        '<div class="bloco demo-contas"><h3>🧪 Contas de demonstração <span class="rot-demo">senha demo123</span></h3>' +
          '<button class="btn-sec" data-demo="ana.ribeiro@exemplo.com">👤 Cliente · ana.ribeiro@exemplo.com</button>' +
          '<button class="btn-sec" data-demo="contato@vidapet.exemplo">🏥 Clínica · contato@vidapet.exemplo</button></div>'
      : '<div class="tipo-conta">' +
          '<button class="tipo-op' + (tipo === "cliente" ? " ativo" : "") + '" data-tipo="cliente"><span class="ic">🐶</span><b>Sou tutor</b><small>Compro na loja e cuido do meu pet</small></button>' +
          '<button class="tipo-op' + (tipo === "clinica" ? " ativo" : "") + '" data-tipo="clinica"><span class="ic">🏥</span><b>Sou clínica</b><small>Vejo indicadores dos clientes</small></button></div>' +
        AVISO_LGPD + (tipo === "cliente" ? formCliente : formClinica) + acesso +
        '<button class="btn-prim" id="btCadastrar">Criar conta de ' + (tipo === "cliente" ? "tutor" : "clínica") + '</button><div id="authErro"></div>') +
    '<button class="link-demo" id="btVisitante">Continuar sem conta (modo demonstração) →</button>';

  telas.login.querySelectorAll(".auth-abas .aba").forEach(b => b.addEventListener("click", () => renderLogin(b.dataset.aba, tipo)));
  telas.login.querySelectorAll(".tipo-op").forEach(b => b.addEventListener("click", () => renderLogin("cadastro", b.dataset.tipo)));
  $("btVisitante").addEventListener("click", () => { aplicarConta(null, "visitante"); mostrar("lista"); if (catalogo.ofertas.length) render(); });
  const erro = msg => { $("authErro").innerHTML = '<div class="aviso-erro">' + esc(msg) + '</div>'; };

  if (aba === "entrar") {
    const entrar = async () => {
      const bt = $("btEntrar"); bt.disabled = true;
      try {
        const r = await api("/api/login", { method: "POST", body: JSON.stringify({ email: $("lEmail").value, senha: $("lSenha").value }) });
        entrarComConta(r.conta, "Olá, " + (r.conta.tipo === "clinica" ? r.conta.clinica.nome : r.conta.tutor.nome.split(" ")[0]) + "!");
      } catch (e) { erro(e.message); bt.disabled = false; }
    };
    $("btEntrar").addEventListener("click", entrar);
    $("lSenha").addEventListener("keydown", e => { if (e.key === "Enter") entrar(); });
    telas.login.querySelectorAll("[data-demo]").forEach(b => b.addEventListener("click", () => { $("lEmail").value = b.dataset.demo; $("lSenha").value = "demo123"; $("lSenha").focus(); }));
    return;
  }
  if (tipo === "cliente") {
    $("btCpf").addEventListener("click", () => { $("cCpf").value = cpfFicticio(); });
    $("cCpf").addEventListener("input", e => { e.target.value = mascaraCpf(e.target.value); });
    $("cEsp").addEventListener("change", e => { if (e.target.value === "gato") $("cPorte").value = "pequeno"; });
  } else {
    $("k24").addEventListener("change", e => { $("kAbre").disabled = $("kFecha").disabled = e.target.checked; });
  }
  $("btCadastrar").addEventListener("click", async () => {
    const corpo = { tipo, email: $("cEmail").value, senha: $("cSenha").value };
    if (tipo === "cliente") Object.assign(corpo, { nome: $("cNome").value, cpf: $("cCpf").value, telefone: $("cTel").value, endereco: $("cEnd").value,
      pet: { nome: $("cPet").value, especie: $("cEsp").value, raca: $("cRaca").value, idade_anos: parseFloat($("cIdade").value), porte: $("cPorte").value, observacoes_saude: $("cObs").value } });
    else Object.assign(corpo, { nome: $("kNome").value, telefone: $("kTel").value, endereco: $("kEnd").value, abre: $("kAbre").value, fecha: $("kFecha").value,
      aberto_24h: $("k24").checked, especialidades: [...telas.login.querySelectorAll('input[name="kEsp"]:checked')].map(i => i.value) });
    const bt = $("btCadastrar"); bt.disabled = true;
    try {
      const r = await api("/api/cadastro", { method: "POST", body: JSON.stringify(corpo) });
      entrarComConta(r.conta, "✅ Conta criada! Bem-vindo(a) ao PatasPerto.");
    } catch (e) { erro(e.message); bt.disabled = false; }
  });
}

/* ================= PAINEL DA CLÍNICA =================
   Tudo aqui é CONSULTA/AGREGAÇÃO AO BANCO (GROUP BY em banco/consultas.py) — não é IA.
   A clínica vê só totais agregados: nenhum CPF, nome ou dado de saúde individual. */
const NOME_ESPECIE = { cao: "🐶 Cães", gato: "🐱 Gatos" };
const fmtInt = n => Number(n).toLocaleString("pt-BR");
const fmtR$ = v => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function barraH(rotulo, sub, valor, max, txt, destaque) {
  return '<div class="hbar' + (destaque ? " top" : "") + '"><span class="hb-rot">' + esc(rotulo) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
    '<div class="trilho"><div class="fill" style="width:' + (max ? Math.max(2, valor / max * 100) : 0) + '%"></div></div><span class="hb-val">' + txt + '</span></div>';
}

async function renderPainel(periodo = "mes") {
  telas.painel.innerHTML = '<p class="vazio-clin">Carregando indicadores…</p>';
  let d;
  try { d = await api("/api/clinica/painel?periodo=" + periodo); }
  catch (e) {
    if (/login/.test(e.message)) { abrirLogin("entrar"); toast("Sua sessão expirou. Entre novamente."); return; }
    telas.painel.innerHTML = '<div class="aviso-erro">' + (e.message.startsWith("HTTP") || e.message.includes("fetch") ? MSG_SEM_API : esc(e.message)) + '</div>';
    return;
  }
  const t = d.totais, c = d.clinica;
  const kpi = (ic, valor, rot) => '<div class="kpi"><span class="kpi-ic">' + ic + '</span><span class="kpi-v">' + valor + '</span><span class="kpi-r">' + rot + '</span></div>';
  const maxItens = Math.max(1, ...d.mais_comprados.map(x => x.itens));
  const totPets = d.especies.reduce((s, e) => s + e.n, 0) || 1;
  const maxRaca = Math.max(1, ...d.racas.map(r => r.n));
  const maxVol = Math.max(1, ...d.volume.map(v => v.compras));
  const rotDb = '<span class="rot-db">GROUP BY</span>';

  telas.painel.innerHTML =
    '<h2 class="det-titulo">🏥 ' + esc(c.nome) + ' <span class="rot-db">consulta ao banco · agregação</span></h2>' +
    '<p class="secao" style="margin:6px 0 0">Indicadores dos clientes do PatasPerto calculados com <b>consultas de agregação ao banco</b> (COUNT, SUM, AVG + GROUP BY) — <b>não é IA</b>. Últimos ' + d.janela_dias + ' dias.</p>' +
    '<div class="kpis">' +
      kpi("👥", fmtInt(t.clientes), "clientes cadastrados") + kpi("🐾", fmtInt(t.pets), "pets") +
      kpi("🛒", fmtInt(t.compras), "compras no período") + kpi("💰", fmtR$(t.faturamento), "volume em compras") +
      kpi("🧾", fmtR$(t.ticket_medio), "ticket médio") + kpi("🩺", fmtInt(t.pets_com_obs_saude), "pets com obs. de saúde") + '</div>' +
    '<div class="painel-grid">' +
      '<div class="bloco"><h3>🛒 O que os clientes mais compram ' + rotDb + '</h3><p class="origem">itens vendidos por produto · GROUP BY produto</p>' +
        d.mais_comprados.map((x, i) => barraH(x.nome, x.categoria + " · " + x.clientes + " clientes", x.itens, maxItens, fmtInt(x.itens), i === 0)).join("") + '</div>' +
      '<div class="bloco"><h3>🐾 Espécies e raças ' + rotDb + '</h3><p class="origem">pets cadastrados · GROUP BY espécie, raça</p>' +
        d.especies.map((e, i) => barraH(NOME_ESPECIE[e.especie] || e.especie, "idade média " + num1(e.idade_media) + " anos", e.n, totPets, pct(e.n / totPets), i === 0)).join("") +
        '<p class="sub-tit">Raças mais frequentes</p>' +
        d.racas.map((r, i) => barraH(r.raca, NOME_ESPECIE[r.especie] || r.especie, r.n, maxRaca, fmtInt(r.n), i === 0)).join("") + '</div>' +
      '<div class="bloco"><h3>🎯 Match categoria × espécie ' + rotDb + '</h3><p class="origem">itens por categoria dentro de cada espécie · GROUP BY espécie, categoria</p>' +
        Object.entries(d.match_categoria_especie).map(([esp, lista]) => '<p class="sub-tit">' + (NOME_ESPECIE[esp] || esp) + '</p>' +
          lista.map((m, i) => barraH(m.categoria, null, m.participacao, 1, pct(m.participacao) +
            ' <span class="afin' + (m.afinidade >= 1.2 ? " alta" : "") + '" title="participação na espécie ÷ participação geral">' + num1(m.afinidade) + '×</span>', i === 0)).join("")).join("") +
        '<p class="explica"><b>%</b> = fatia da categoria nas compras de quem tem aquela espécie. <b>×</b> = afinidade: quantas vezes acima (ou abaixo) da média geral a espécie compra a categoria.</p></div>' +
      '<div class="bloco"><h3>📈 Volume de compras por período ' + rotDb + '</h3>' +
        '<div class="filtros periodo"><button class="chip' + (periodo === "mes" ? " ativo" : "") + '" data-per="mes">Por mês</button><button class="chip' + (periodo === "semana" ? " ativo" : "") + '" data-per="semana">Por semana</button></div>' +
        '<div class="colunas">' + d.volume.map(v => '<div class="col" title="' + v.compras + ' compras · ' + fmtR$(v.valor) + '"><span class="col-v">' + v.compras + '</span>' +
          '<div class="col-b" style="height:' + (v.compras / maxVol * 100) + '%"></div><span class="col-r">' + v.periodo + '</span></div>').join("") + '</div>' +
        '<p class="origem" style="margin-top:8px">compras por ' + (periodo === "semana" ? "semana (início na segunda-feira)" : "mês") + ' · GROUP BY strftime(data)</p></div>' +
    '</div>' +
    '<div class="bloco"><h3>🏥 Sua clínica <span class="rot-db">tabela clinicas</span></h3>' +
      '<p class="local">📍 ' + esc(c.endereco) + ' · 📞 ' + esc(c.telefone) + ' · 🕘 ' + (c.aberto_24h ? "24 horas" : esc(c.abre) + "–" + esc(c.fecha)) + '</p>' +
      '<div class="chk-grupo" style="margin-top:8px">' + c.especialidades.map(e => '<span class="tag-esp">' + (ESPECIALIDADES_NOMES[e] || esc(e)) + '</span>').join("") + '</div></div>' +
    '<div class="aviso lgpd" style="margin-top:16px">🔒 Dados <b>fictícios</b> e <b>agregados</b>: a clínica não recebe CPF, nome nem observações de saúde de clientes individuais (LGPD).</div>';

  telas.painel.querySelectorAll("[data-per]").forEach(b => b.addEventListener("click", () => renderPainel(b.dataset.per)));
}

/* ---- Navegação ---- */
const navs = { lista: $("navLoja"), recomendacao: $("navRec"), mapa: $("navMapa"), emergencia: $("navEmg") };
function mostrar(nome) {
  Object.entries(telas).forEach(([k, el]) => { el.style.display = k === nome ? "block" : "none"; });
  Object.entries(navs).forEach(([k, el]) => el.classList.toggle("ativo", k === nome));
  window.scrollTo(0, 0);
}
navs.lista.addEventListener("click", () => mostrar("lista"));
navs.recomendacao.addEventListener("click", () => { mostrar("recomendacao"); renderRecomendacao("checkup"); });
navs.emergencia.addEventListener("click", () => { mostrar("emergencia"); renderEmergenciaHome(); });
navs.mapa.addEventListener("click", () => { mostrar("mapa"); renderMapa(); });
$("btConta").addEventListener("click", () => {
  if (conta && conta.tipo === "clinica") { mostrar("painel"); renderPainel(); } else { mostrar("perfil"); renderPerfil(); }
});
$("btSair").addEventListener("click", () => conta ? sair() : abrirLogin("entrar"));
$("logo").addEventListener("click", () => {
  const modo = document.body.dataset.modo;
  if (modo === "clinica") { mostrar("painel"); renderPainel(); } else if (modo !== "anon") mostrar("lista");
});
$("botaoBusca").addEventListener("click", () => { termoAtual = campo.value; render(); });
campo.addEventListener("keydown", e => { if (e.key === "Enter") { termoAtual = campo.value; render(); } });
document.querySelectorAll(".chip").forEach(chip => chip.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("ativo")); chip.classList.add("ativo"); ordemAtual = chip.dataset.ord; render();
}));

// Atalhos por URL para a apresentação: /#mapa, /#recomendacao, /#emergencia, /#perfil
// ?pos=lat,lon[,rótulo] define a localização sem GPS (ex.: /?pos=-22.9056,-47.0608,Campinas#mapa)
(() => {
  const q = new URLSearchParams(location.search).get("pos");
  if (!q) return;
  const [lat, lon, ...rot] = q.split(",");
  if (isFinite(+lat) && isFinite(+lon)) salvarPosicao({ lat: +lat, lon: +lon, fonte: "endereco", rotulo: rot.join(",").trim() || ("Posição definida por URL (" + lat + ", " + lon + ")") });
})();
const abrirPorHash = () => {
  if (["clinica", "anon"].includes(document.body.dataset.modo)) return;   // atalhos são da visão do cliente
  const h = location.hash.replace("#", "");
  if (h === "mapa") { mostrar("mapa"); renderMapa(); }
  else if (h.startsWith("recomendacao")) {          // /#recomendacao ou /#recomendacao/convulsao (já dispara)
    const sit = h.split("/")[1];
    mostrar("recomendacao"); renderRecomendacao(sit || "checkup");
    if (sit && NOME_SIT[sit]) pedirRecomendacao();
  }
  else if (h === "emergencia") { mostrar("emergencia"); renderEmergenciaHome(); }
  else if (h === "perfil") { mostrar("perfil"); renderPerfil(); }
};
window.addEventListener("hashchange", abrirPorHash);

/* ---- Início: quem está logado decide a visão ----
   cliente → app normal (loja, recomendação, perfil) com o tutor da conta
   clínica → painel de indicadores agregados (outra visão, outro cabeçalho)
   sem conta → tela de login; "continuar sem conta" (ou um atalho /#...) abre o modo demonstração */
(async () => {
  let c = null, apiNoAr = true;
  try { c = (await api("/api/sessao")).conta; } catch { apiNoAr = false; }
  aplicarConta(c, c ? c.tipo : (location.hash || !apiNoAr ? "visitante" : "anon"));
  carregarDados();
  if (c && c.tipo === "clinica") { mostrar("painel"); renderPainel(); }
  else if (document.body.dataset.modo === "anon") { mostrar("login"); renderLogin("entrar"); }
  else { mostrar("lista"); abrirPorHash(); }
})();
