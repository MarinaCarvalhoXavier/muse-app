# Muse — guarda-roupa com IA
### Documentação do projeto (para dar continuidade em outra conversa)

---

## 1. O que é o app

Um app pessoal de guarda-roupa digital que resolve um problema real de quem tem muitas roupas e mesmo assim repete sempre os mesmos looks, porque é difícil visualizar tudo o que já tem. Cataloga roupas, sapatos e acessórios com fotos; organiza looks salvos por ocasião; e usa IA para automatizar as partes chatas (tagueamento, remoção de fundo, sugestão de combinações).

Nome de trabalho: **Muse**. Pode trocar — é só texto no protótipo, sem dependência técnica.

## 2. Contexto e problema

**Problema original (da criadora, que é também a usuária principal):** guarda-roupa grande, gosta de moda, mas a dificuldade de visualizar o que possui leva à repetição de looks e à subutilização das peças — principalmente acessórios e sapatos.

**Validação por pesquisa secundária:**
- A maioria das pessoas usa regularmente só 20-30% do próprio guarda-roupa; o resto fica parado. Isso se confirma tanto em fontes internacionais quanto brasileiras.
- A partir de ~80 peças, fica quase impossível monitorar mentalmente tudo o que se tem — memória para de dar conta, o que leva a compras duplicadas.
- Tem uma dimensão emocional real: pesquisa encomendada pela Marks & Spencer achou que mulheres gastam em média 17 min/dia escolhendo roupa, 62% relatam irritação no processo, 15% dizem que isso afeta o humor do dia. Não é só desorganização, é carga cognitiva e desgaste diário.

**Concorrência (benchmarking):**
| App | Forte em | Fraqueza |
|---|---|---|
| Stylebook | Catalogação manual profunda | Sem IA, só iOS |
| Acloset | IA tagueia automaticamente ao subir a foto | Tagueamento inconsistente, acerta categoria mais que cor |
| Whering | Sustentabilidade / impacto ambiental | Foco é impacto, não estilo |
| Cladwell | Guarda-roupa cápsula | Não serve pra armário grande e variado |
| Clueless / Nouva / minniie | Styling por IA | Focados em recomendação, não em fotografia do produto |

**Gap identificado (diferencial real do Muse):** nenhum concorrente pesquisado junta tagueamento detalhado + transformação da foto em estilo catálogo/vitrine + organização flexível por categorias que o próprio usuário cria. Os apps de guarda-roupa cortam fundo e tagueiam; os apps de "foto de produto profissional" são voltados a quem vende roupa (e-commerce), não a quem organiza o próprio armário.

## 3. Para quem (persona)

- 18-24 anos, trabalho híbrido — o que multiplica os "registros" de vestimenta numa mesma semana (dias presenciais, home office que ainda pede apresentação em call, vida social), aumentando a carga de decisão em vez de simplificar.
- Gosta de moda, quer explorar estilo, mas trava na execução do dia a dia.

**As duas dores (são diferentes, pedem soluções diferentes):**
1. **Falta de visão** — não lembra o que tem, esquece principalmente acessórios (validado: quando perguntada o que mais esquece na hora de montar um look, a resposta foi acessórios, não sapatos nem roupa).
2. **Preguiça de decidir** — mesmo sabendo o que tem, falta energia mental pra combinar. Essa é a dor que o Stylist IA ataca diretamente.

**Como a persona se relaciona com IA (validado):** confiança condicional, não cega. Se a IA sugerir um outfit pronto, o comportamento esperado é "usar como ponto de partida e ajustar algo" — nunca aceitar de olhos fechados, nem ignorar e montar do zero.

**JTBD:** *"Quando tenho um compromisso e preciso decidir o que vestir, quero ver rapidamente as combinações possíveis com o que já tenho — incluindo acessórios — pra não repetir sempre os mesmos looks e sentir que aproveito de verdade o que comprei."*

## 4. Viabilidade técnica (resumo da análise)

Tudo é viável de construir sozinha com Claude Pro (Claude Code fazendo o código), Figma (opcional, só pra desenhar telas antes — não é obrigatório), e um conjunto pequeno de serviços pagos por uso:

- **Supabase** — banco de dados + armazenamento de fotos (grátis pra começar, ~$25/mês se crescer muito).
- **Vercel** — hospedagem (grátis pra projeto pessoal).
- **Photoroom API** — remoção de fundo ($0,02/imagem) e o efeito "foto de catálogo" / manequim fantasma ($0,10/imagem). Resolve exatamente a ideia nº 6 (a mais difícil), que tecnicamente já existe pronta no mercado.
- **API do Claude** (conta separada do Claude Pro, paga por uso) — tags automáticas e sugestões de outfit dentro do próprio app. Volume pessoal fica na casa de centavos a poucos dólares por mês.

**Custo estimado total:** além do Claude Pro que já paga, entre R$0 (usando tudo no free tier) e ~R$150-200/mês no cenário mais robusto, mais um gasto pontual de R$50-100 pra digitalizar o armário inteiro com efeito catálogo.

**Tempo estimado:** MVP básico em 1-2 semanas part-time; versão completa com IA em 4-6 semanas.

## 5. Priorização / roadmap do MVP

| Versão | Entra | Por quê |
|---|---|---|
| **V1** | Fotos organizadas por categoria + fundo removido + looks salvos em seções personalizáveis | Mais simples tecnicamente, e o que você mais queria ver funcionando primeiro |
| **V2** | Tags automáticas (cor, tipo, clima) + fotos estilo vitrine/catálogo | Camada de qualidade em cima da base que já funciona |
| **V3** | IA sugerindo combinações prontas (Stylist IA) | Mais dependente de tudo o que vem antes — só fica boa se o armário já estiver bem tagueado |

**Tensão registrada (importante pro case):** você priorizou "tags automáticas" por último entre as funcionalidades base, mas o discovery apontou as tags como a fundação de tudo (alimentam busca, IA e organização). Não é contradição — é que o valor percebido de curto prazo (ver o armário organizado) é mais imediato que o valor estrutural de longo prazo (dados estruturados que só compensam depois). Por isso o V1 tageia manualmente e só automatiza via IA no V2.

## 6. Arquitetura do produto

**Navegação (5 posições na barra inferior):**
- Armário (peças organizadas por categoria, estilo vitrine de loja)
- Outfits (looks salvos, organizados por seções que o usuário cria)
- **+** central, elevado — abre direto o fluxo de escanear uma peça nova (não é pra criar outfit, é só pra adicionar roupa)
- Stylist IA (sugestão de combinação)
- Perfil (ainda o mais indefinido — hoje tem stats do armário + destaque de peças esquecidas + configurações)

**Fluxo de adicionar peça:** botão + → câmera detecta a peça (contorno automático) → tela de confirmação com foto já sem fundo e campos pré-preenchidos pela IA (editáveis) → salva no Armário.

**Campos da peça (tela de confirmação):**
- Tipo (Blusas / Calças / Sapatos / Acessórios)
- Ocasião (Casual / Trabalho / Festa chique / Balada eletrônica — mesmo vocabulário usado nas seções do Outfits, multi-seleção)
- Cor (swatches)
- Estação (Verão / Inverno / Outono / Primavera)
- Clima (frio / sol / chuva)
- Favorita (toggle rápido, visível)
- Atrás de "+ mais detalhes" (opcional, não obrigatório — pra não pesar o cadastro): marca, notas, estampa/padrão
- **Não deveria ser campo manual:** última vez usada / nº de vezes usada — isso o sistema rastreia sozinho quando a pessoa "loga" um look usado, sem esforço nenhum extra.

**Lógica do Outfits:** um look pode ficar sem categoria (salvo solto) ou em mais de uma categoria ao mesmo tempo (ex: uma peça de trabalho que também serve pra um encontro casual). Ideia futura (V4): a IA aprender o estilo da pessoa a partir dos looks já salvos numa categoria, e sugerir a partir disso — mas só faz sentido depois que já existem looks suficientes salvos (problema clássico de cold start).

**Comportamento do Stylist IA:** cada peça da sugestão tem botão próprio de trocar — não é um "aceitar ou recusar o look inteiro". Isso é decisão de design direta, pra bater com o padrão de confiança condicional validado na persona.

## 7. O que quero de IA (resumo)

1. Remoção automática de fundo da foto da peça.
2. Preenchimento automático dos dados da peça (tipo, cor, clima de uso) a partir da própria foto.
3. Sugestão de combinações de outfit misturando as peças do armário — funcionando como um stylist pessoal.
4. (Mais avançado, mas viável) Transformar a foto da peça numa imagem estilo catálogo de loja — resolvido tecnicamente via API de terceiro (Photoroom), não precisa ser construído do zero.
5. (Ideia futura, V4) IA aprendendo o estilo pessoal a partir dos looks já organizados por categoria.

## 8. Identidade visual

- **Nome:** Muse
- **Tipografia:** Fraunces (serifada, editorial) pros títulos e a marca — Manrope (sans geométrica) pro resto da interface.
- **Cor primária (terracota, #C1694A):** ação do usuário — botões, abas ativas, favoritos.
- **Cor secundária (verde-sálvia, #5C7A54):** sinaliza especificamente "isso foi a IA que fez/sugeriu" — usada no selo "Preenchido pela IA", na legenda do Stylist, no check de "peça detectada" ao escanear. A ideia é que a pessoa enxergue visualmente, sem precisar ler nada, o que foi decisão dela e o que foi sugestão da IA.

## 9. Status de implementação (V1 em andamento)

- Projeto Next.js + Tailwind criado em `muse-app/`.
- Telas Armário, Adicionar peça (manual), Outfits, Stylist IA (placeholder) e Perfil implementadas com dados salvos em `localStorage` (armazenamento temporário até a Fase de conexão com Supabase).
- Falta: conectar Supabase (banco real + fotos), Photoroom (remoção de fundo automática), tags automáticas por IA, Stylist IA de fato, e polimento de interação da tela de Perfil.

## 10. Em aberto / próximos passos

- Perfil ainda é a tela menos validada — foi decisão meio "talvez" desde o início.
- Falta: polimento final de detalhes de interação (estados de hover/pressed) e a montagem da página final do case (reunindo discovery, personas, decisões e telas numa narrativa única, provavelmente como página web tipo portfólio).
- Nome "Muse" e paleta de cores são reversíveis — foram decisão de "liberdade criativa", não validação com usuária real.
