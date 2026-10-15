# PatasPerto

Marketplace pet acadêmico: Flask + SQLite + Random Forest (scikit-learn). Front-end em HTML, CSS e JS puro em `static/`. Visão geral e rotas da API no `README.md`; padrão visual no `DESIGN.md`.

## Rodar e testar

- Preparar tudo (venv, banco, dataset, modelo e app): `bash preparar.sh`. Funciona no Windows (Git Bash) e no Linux/Mac.
- Subir o app: `python app.py` → http://127.0.0.1:5000. No Windows, use `.venv/Scripts/python.exe` com `PYTHONUTF8=1`. O debug vem desligado; `FLASK_DEBUG=1` liga a recarga automática.
- Segurança: rode `semgrep --config auto .` e os testes de `tests/test_seguranca.py` antes de publicar. Toda rota nova valida a entrada no servidor e usa `_tutor_alvo()`, nunca o id que vem da tela.
- Testes: `python -m pytest tests/`. Cada teste usa uma cópia temporária do banco (fixture `banco_temp`, autouse), então rodar os testes não altera o banco do app.
- Mudou `banco/schema.sql`? Rode `python banco/criar_banco.py` para recriar o banco. No Windows, pare o servidor antes, porque ele trava o arquivo `.db`.

## Regras do projeto

- Dados de lojas, produtos, clientes, CPFs e saúde dos pets são **fictícios** (LGPD). Nunca use dados reais.
- O **pagamento é simulado** (`POST /api/pedidos`): nunca peça nem guarde dados de cartão.
- Toda compra vai para a tabela `compras`, que alimenta a IA. A IA indica a especialidade; o banco filtra as clínicas. Mantenha essa separação visível na interface (rótulos "IA" × "consulta ao banco").
- Cores só por variáveis CSS; ícones por `ic()`, nunca emoji (ver `DESIGN.md`).
- Arquivos gerados (`patasperto.db`, `dataset.csv`, `modelo.pkl`, `metricas.json`) ficam fora do Git.
