# PatasPerto — design

A marca é a **cachorrinha salsicha**. Tudo no visual sai dela: as cores do logo, a forma alongada (a pílula) e a bolinha de tênis da foto.

## Cores

Use sempre as variáveis de `static/style.css` (`:root`), nunca um hex solto no código.

| Token | Valor | Uso |
|---|---|---|
| `--marca` | `#8E4318` | marrom salsicha: títulos de destaque, botões primários, item ativo da navegação |
| `--marca-hover` | `#6F3311` | hover de botões com texto branco |
| `--marca-medio` | `#C06A34` | corpo da salsicha do logo: ilustrações e detalhes. **Não usar em texto pequeno** |
| `--marca-claro` | `#F7E6D2` | fundos suaves, opção selecionada, badges |
| `--fundo` | `#FDF8F0` | creme do logo: fundo da página |
| `--texto` | `#3B2316` | chocolate (o contorno do logo): texto principal |
| `--texto-suave` | `#6F5646` | texto secundário |
| `--bolinha` | `#CDDC39` | verde da bolinha de tênis: destaque alegre (selo "Menor preço", contador do carrinho, confirmação). **Sempre com `--texto` por cima, nunca como cor de texto** |

O modo clínica tem identidade própria (verde-petróleo, `--petroleo*`), para não se confundir com a loja.

### Contraste (WCAG AA, mínimo 4,5:1 para texto comum)

| Combinação | Contraste |
|---|---|
| branco sobre `--marca` | 7,1 |
| `--marca` sobre `--fundo` | 6,7 |
| `--texto` sobre `--fundo` | 13,8 |
| `--texto-suave` sobre `--fundo` | 6,4 |
| `--texto` sobre `--bolinha` | 9,7 |

Criou uma combinação nova de texto e fundo? Confira o contraste antes (por exemplo, em webaim.org/resources/contrastchecker).

## Tipografia

- **Nunito 800** (arredondada, combina com as letras do logo): títulos, preços e botões.
- **Poppins**: textos corridos.
- As duas ficam em `static/vendor` (licença OFL), então funcionam sem internet.

## Formas

- **A pílula é o "corpo da salsicha"**: botões, chips, busca, contador e a moldura da foto do hero usam `--pilula`.
- Cards e blocos têm cantos arredondados (18 a 22 px) e sombra suave.

## Ícones

- Ícones SVG de traço, em `ICONES` no `static/app.js`. Use `ic("nome")` dentro do HTML montado pelo JS, ou `data-ic="nome"` no `index.html`.
- **Não use emoji como ícone.** A exceção é o avatar do pet no perfil.
- Botão só com ícone precisa de `aria-label`.

## A salsicha

- `salsicha(progresso, rotulo)` no `app.js` desenha a salsicha de perfil. O corpo estica de 0 a 1.
- No carrinho, ela mostra quanto falta para o frete grátis (R$ 100).
- Use com moderação: ela é o elemento memorável da marca, não um enfeite para todo canto.

## Movimento

- Só movimento que responde a uma ação: hover, toque, o "pulo" do carrinho ao adicionar um item.
- Nada de animação de entrada em cada seção.
- `prefers-reduced-motion` desliga as animações.

## Acessibilidade (piso)

- Foco visível (`:focus-visible`).
- Rádios e botões de verdade, mesmo quando desenhados como cartões.
- Nenhuma tela rola na horizontal no celular (testado a 390 px).
