# Trilha de código — React 3.1.24

Geometria configurável: `tool-geometry-fields.mjs` define os campos por tipo e valida dimensões. `Tools.jsx` atualiza o croqui ao digitar. `core.js:simTool` transporta `insertWidth`, `insertLength`, `shankThickness`, `mount`; `sim.js:toolShape` aplica dimensões e espelhos com polígono anti-horário. `tool-drawing.mjs:configuredParts` monta a haste, cabeça e inserto com a mesma referência. `toolsetup.js:defaultTip` sugere a ponta compatível com a montagem, mantendo o ajuste explícito da programação. `Simulation.jsx` oferece 400×. Regressões: `tool-geometry.test.cjs`, `test-tool-geometry.cjs`; relatório `RELATORIO-GEOMETRIA-SUPORTE-3.1.24.md`.

Animação das ferramentas: `sim.js:toolShape` define o polígono físico. `tool-drawing.mjs:simulationToolParts` compartilha esse polígono com `ToolDrawing.jsx` e `Simulation.jsx`, sem o espelhamento ilustrativo do cadastro. O worker retorna `toolMissing` quando uma ferramenta de corte não tem associação; `Program.jsx` mostra o T pendente e não apresenta uma cena padrão incorreta. Regressões: `tool-animation.test.cjs`, `test-tool-animation.cjs`; relatório `RELATORIO-SIMULACAO-FERRAMENTAS-3.1.23.md`.

Simulação responsiva: `Program.jsx` → `use-worker-job.mjs` → `public/engine/simulation-worker.js`. O worker lê o programa, monta a cena e produz diagnósticos; outro worker mantém o motor de material e responde aos destinos mais recentes. A interface descarta respostas de entradas anteriores. `Simulation.jsx` desenha quadros sem executar `analyze`/`seek` na thread da interface. Associação e montagem: `toolsetup.js` → `tool-setup.mjs` → `domain.mjs`, `Generator.jsx`, `Program.jsx`. Banco sem T obrigatório; posição, corretor, raio e ponta pertencem ao trabalho. `sim.js:toolShape` usa a ponta do corretor; `progsim.js:montarCena` conserva o percurso programado para comparação. G73: `ciclo73` pula P/Q após o desbaste; `core.js:psLado` aplica o mesmo comportamento. Ensaios: `simulation-corrections.test.cjs`, `test-simulation-corrections.cjs`; relatório `RELATORIO-SIMULACAO-FERRAMENTAS-3.1.23.md`.

Cilindragem protegida: `cad-sides.mjs:prepareCadSides` conserva o maior raio do perfil completo em cadRadiusLimit na cópia recortada. `cadprofile.js:safeMachiningPath` mantém o prefixo acessível e substitui a região após a primeira queda radial por cilindragem no maior Ø até o comprimento selecionado. `core.js:psContorno` compila essa cópia; `psLado` usa o mesmo contorno no desbaste, acabamento e simulador. O desenho salvo permanece integral. Regressões: `tests/cad-machining-safety.test.cjs`, `scripts/test-cad-machining-safety.cjs`. Relatório: `RELATORIO-CILINDRAGEM-PROTEGIDA-3.1.17.md`.

Dois lados no CAD: `dxfimport.js:saveData`, `renderSaveSides` → `CadImport.jsx:CNCDesenhos.previewSides` → `cad-document.mjs:cadDocument` → `cad-sides.mjs:createOppositeCadSide`. A etapa 3 visualiza ambos e salva perfis completos. Comprimentos: `Generator.jsx` → `form.cadUsinagem[desenhoId]` → `domain.mjs:generate` → `prepareCadSides`, `cadMachiningLimits`. A geração recorta uma cópia. `App.jsx:useDrawing` atualiza IDs existentes; `data.mjs:mergeWorkspace` remapeia parâmetros de backups. Relatório: `RELATORIO-CAD-LADOS-GERADOR-3.1.15.md`.

Preparação CAD antes de salvar: `src/assets/cad-panel.html` define Z0/comprimento na etapa 2; `public/engine/dxfimport.js:setStep`, `checkPreparation`, `showPreparation` controlam a passagem à etapa 3. `public/engine/dxfaudit.js:preparation` reúne bloqueios e dicas, preservando a validação CNC existente. Regressões: `tests/cad-profile.test.cjs`, `scripts/test-cad-stages.cjs` e `scripts/test-disco-real.cjs`. Relatório: `RELATORIO-PREPARACAO-CAD-3.1.14.md`.

Leia `MAPA-CODIGO.md` e este arquivo antes de editar. `PROJECT_INDEX.json` contém caminhos, tamanhos, hashes SHA-256, imports e símbolos com faixas de linhas. `GRAFO-CODIGO.json` acrescenta chamadas, relações JSX, dependências e conceitos locais. Use as consultas de `pnpm mapa:query`; confirme os trechos encontrados no fonte. Implementação local inspirada no Graphify, sem executar o produto Graphify.

**Padrão vigente desde 11/10/2026:** usar somente a versão leve nas próximas modificações, testes e entregas. Instruções persistentes em `AGENTS.md`. `pnpm start` e `pnpm desktop` abrem o lançador leve; `pnpm package` empacota a versão leve após `pnpm build`; `pnpm test:ui` testa essa distribuição. As referências a Electron abaixo documentam a implementação anterior.

## Fluxos e pontos de entrada

| Objetivo | Entrada | Dependências e dados |
|---|---|---|
| Inicialização e sessão | `src/main.jsx`, `src/App.jsx` | Motores globais carregados por `index.html`; workspace carregado antes de salvar |
| Gerar programa | `src/components/Generator.jsx` → `src/domain.mjs:generate` | `CNC.GERADORES`, ferramentas, desenho selecionado, configurações |
| Desenho manual por elementos | `src/components/Drawing.jsx` → `PieceBuilder.jsx`, `src/piece-elements.mjs` | Paleta/croquis em `src/assets/element-drawings.mjs`; arrays `trechos1/2`, `internos1/2`; IDs e campos extras preservados |
| Raios e chanfros de cones | `core.js:psCantosPerfil`, `psCurvaCanto`, `psContornoComCones` | Tangência em Z/raio; macros 600+ externas e 800+ internas; validadores de arestas, sobreposição e canais |
| Ferramentas | `src/components/Tools.jsx` | Identificação, tipo, geometria, montagem física e dados de corte; T definido na programação; campos adicionais preservados |
| Interpretar TXT | `src/components/Program.jsx` | `CNCProg.interpretar`, `montarCena`, `CNCDiag.diagnosticar` |
| Remover material | `src/components/Simulation.jsx` | `CNCSim.Sim`, seek, grades de material e placa, alertas |
| PDF local | `src/components/PdfImport.jsx` | pdf.js local → cotas → reconhecimento → linhas vetoriais → orientação → perfil |
| Evitar resultado PDF atrasado | `src/pdf-state.mjs` | revision/completedRevision; invalidar confirmação antes de nova leitura |
| Importar e preservar | `src/data.mjs` → `Backup.jsx` | parseTransfer, mergeWorkspace, remapeamento de IDs em seleções |
| Persistir no Windows · versão leve | `lightweight/Servidor-CNC.ps1` → ponte `desktop` → `src/App.jsx` | API local com token/origem, escrita temporária e substituição, backup anterior, proteção contra alteração externa |
| Persistir no navegador | `src/data.mjs:saveBrowser` | chave `cnc.react.workspace.v3` + cópia anterior |
| Construir / empacotar · versão leve | `vite.config.mjs`, `scripts/package-light.cjs` | `pnpm build` → `dist` → `pnpm package` → `release/CNC-Torno-Leve` |

## Motores reaproveitados

`public/engine/core.js`: validação, geometrias, ciclos e sete geradores públicos. `sim.js`: remoção de material e colisões. `progsim.js`: macros, ciclos Fanuc, movimentos e montagem de cena. `diagnostico.js`: catálogo, diagnóstico e correções. `seed.js`: ferramentas iniciais. `pecaview.js`: projeção SVG. `pdfdimensions.js`, `pdfrecognizer.js`, `pdfvector.js`, `pdforientation.js`, `pdfprofile.js`: extração assistida e projeção de desenho.

## Regras para manutenção

1. Edite somente esta versão nova; preserve o ZIP e a pasta analisada.
2. Mudanças no motor: execute testes existentes e regressões em `tests/regression.test.cjs`.
3. Não substituir variável de sistema desconhecida por zero. Não apresentar uma interpretação truncada como completa.
4. Qualquer alteração de vista PDF deve invalidar a confirmação antes de operações assíncronas. Ignore respostas de revisões anteriores.
5. Preserve campos desconhecidos dos registros importados; não sobrescreva registros diferentes que tenham o mesmo ID.
6. A interface não tem acesso direto a Node; novos acessos ao disco passam pela API local do servidor PowerShell, com validação de token/origem e proteção dos dados existentes.
7. Não gerar G-code com T inválido ou diâmetro usinado não positivo.

## Verificação

`tests/regression.test.cjs`: falhas corrigidas e migração. `scripts/test-legacy.cjs`: suíte original dos motores e PDF. `scripts/test-light.cjs`: interface e persistência da distribuição leve em perfil temporário; chama os testes de cotas, PDF e CAD. `tests/light-result.json`: resultado dessa validação. As validações reais da máquina estão em `VALIDAR-NA-MAQUINA.md`. Resultados de testes Electron são históricos.

## CAD DXF da base 2.15.0

CadImport.jsx monta src/assets/cad-panel.html e carrega public/engine/dxfimport.js após existir o DOM. A interface CAD original permanece isolada; os adaptadores CNCDesenhos e CNCDXFDrafts escrevem no workspace React. O painel fica montado durante a navegação para manter o trabalho em curso. dxfcore → dxfchains → dxfprofile → dxfaudit/dxfedit: parser, topologia, perfil, auditoria e operações de edição.

src/domain.mjs bloqueia cadOrigem.incompleto ou verificado=false. Drawing.jsx registra revisão completa e reabre a pendência em qualquer edição. data.mjs importa cnc_dxf_rascunhos_v1 e mescla rascunhos sem remover os atuais. Testes adicionais: scripts/test-cad.cjs e tests/base-update.test.cjs. Origem exata: BASE-GITHUB.json.

## Restauração 3.1.1 e distribuição leve

- `RELATORIO-PARIDADE-3.1.1.md`: achados, correções e tamanhos medidos.
- `src/components/DimensionedDrawing.jsx` e `src/assets/dimensioned-drawings.json`: croquis originais com cotas controladas pelo React.
- `src/domain.mjs:numericFields`: valores numéricos e vazios; `selectedDrawing`: escolha explícita; `programTool/programOrientation`: correspondência de T e orientação.
- `src/components/ToolDrawing.jsx` e `src/assets/tool-drawing.mjs`: desenho original de inserto e suporte, sem DOM legado.
- `lightweight/Servidor-CNC.ps1`: servidor Windows local, ponte de persistência, sessão reutilizável, validação de origem e proteção de dados.
- `scripts/package-light.cjs`: pacote com todos os recursos de produção, sem incluir Electron.
- `scripts/test-light.cjs`: Edge, hash dos recursos e testes de persistência/reabertura em perfil temporário.
- `tests/parity.test.cjs` e `scripts/test-parity-ui.cjs`: regressões de cotas, valores, escolhas e prévias.

## Alcance verificado do índice

`RELATORIO-MAPA-3.1.2.md` registra a implementação vigente e seus testes. A extração AST resolve escopo, imports/exports, funções, callbacks, JSX e APIs UMD dos motores, com evidências de arquivo/linha. Busca por assunto usa vocabulário CNC revisado. Referências não resolvidas, inferidas e ambíguas continuam explícitas; o código confirma o comportamento. `TESTE-TRILHA-CODIGO.md` documenta o estado anterior a 3.1.2. O grafo `G:/GPT/analise-v2.11.0/GRAFO-CODIGO.json` pertence somente à base antiga 2.11.0.

## Autenticação e permissões

`src/App.jsx:11`: perfis locais. `App:13`: sessão. `can:20`, `navigate:21`, `useDrawing:22`: permissões e navegação. Login: linha 25; menu e saída: 26. `src/main.jsx` importa e renderiza App; `index.html` carrega main. As telas recebem controle/ações da raiz, sem importar um módulo de autenticação separado. Relatório: `ARQUITETURA-AUTENTICACAO.md`.

## Atualização e entregas do mapa

`scripts/code-map-ast.cjs`: análise estática. `scripts/code-map.cjs`: hashes, grafo, integridade, cache e snapshots. `code-map.config.json`: vocabulário/rotas. `scripts/query-map.cjs`: consultas e registro de uso. `scripts/watch-map.cjs` + `vite.config.mjs`: observação e vínculo com o build. `scripts/package-light.cjs`: inclui e confere `mapa/` da mesma revisão. `tests/code-map.test.cjs`: 12 testes, incluindo concorrência, observador, integridade, recuperação e empacotamento.

## Restauração do editor 3.1.3

- `PieceBuilder.jsx`: 13 cartões, croquis com campos de cotas, diálogo de edição, seleção SVG/teclado/radio de quinas, prévia, cancelamento sem alteração e lista montada.
- `piece-elements.mjs`: defaults, posição sequencial, descrição e aplicação imutável; editar/reordenar preserva os IDs usados pelas marcas.
- `domain.mjs:drawingPreview`: prévia apenas do lado ativo, inclusive rascunho CAD bloqueado para CNC; referência automática considera os dois diâmetros dos cones. `Drawing.jsx` identifica explicitamente a última prévia válida quando há erro.
- `Drawing.jsx`: importar desenhos antigos usando `parseTransfer`/`mergeWorkspace`, com backup anterior e preservação dos atuais.
- `core.js:psContornoComCones`: ativo somente quando o perfil possui cone e marca. Usa tangentes às duas arestas e valida seu comprimento livre; as saídas antigas de perfis sem essa combinação permanecem no caminho original. O tamanho C é medido nas duas arestas. A validação de canais internos considera o recuo real da tangência, inclusive nas uniões contínuas.
- `tests/piece-elements.test.cjs`: 11 regressões de geometria, macros, G71/G72/G73, quinas, croquis, edição e preservação.
- `scripts/test-piece-editor.cjs`: interface da versão leve em perfil temporário; chamado por `test-light.cjs`. Resultado em `tests/piece-editor-result.json`; imagens em `tests/editor-elementos.png`, `tests/croqui-cone.png` e `tests/raio-cone.png`.
- `Common.jsx:ElementsEditor` permanece nos campos auxiliares de listas do Gerador, por exemplo os furos já existentes no bruto; o editor manual usa `PieceBuilder`.

Relatório desta revisão: `RELATORIO-ELEMENTOS-3.1.3.md`. Fonte anterior preservada em `G:/GPT/backups/react-3.1.2-antes-editor-elementos`; a base GitHub 2.15.0 e a entrega leve 3.1.2 não foram alteradas.

## Edição DXF 3.1.4

- `src/assets/cad-panel.html`: modos quebrar, estender por mm/até próximo elemento e conectar em dois cliques. Retira a seção de listagem das cotas, mantendo conferência e salvamento.
- `public/engine/dxfgeometry.js`: interseções analíticas LINE/ARC/CIRCLE, `breakSegment`, `extendLine`, `extendToNext`, `connectLines`, `dedupeGeometry`. Eixo Y CAD é uma construção infinita usada nos encontros, inclusive Y=0; não entra em `doc.geometry`. Operações trabalham sobre cópia do CAD original; falhas não alteram a geometria.
- Polilinhas: só o pai afetado vira primitivas LINE/ARC, com raio e sentido preservados. `replaceSegments` remapeia os IDs de cada aresta para preservar seleção e exclusões. `geometryDelta`/`restoreGeometry` guardam/reabrem original mais diferenças, incluindo entidades adicionadas e removidas.
- `public/engine/dxfimport.js`: limpeza na importação após clonar `sourceDoc`; soma operações ao histórico, atualiza contagem e IDs e invalida confirmação CNC. Conexão destaca a primeira linha e solicita a segunda; seleção cancelável. `lineEdits` antigo continua sendo lido. Eixo numérico zero de rascunhos não é descartado. Lista de cadeias só atribui perfis nos modos correspondentes, evitando erro ao usá-la em um modo de edição.
- `public/engine/dxfprofile.js`: destaque de edição roxo; eixo visível como limite de corte/extensão, sem interferir nos cliques de linhas. Cotas nativas permanecem na projeção e na auditoria.
- `public/engine/dxfedit.js`: API antiga de extensão segue disponível e encaminha ao módulo geométrico. `index.html` carrega `dxfgeometry.js` antes do editor; `dxfimport.js` usa essa API diretamente para que o mapa registre os consumidores.
- `tests/dxf-geometry.test.cjs`: 17 testes de interseções, eixo zero, arcos, polilinhas, remapeamento, limites, falhas sem mutação, limpeza e delta.
- `scripts/test-dxf-operations.cjs`: Edge, cliques reais, perfil temporário; verifica limpeza, quebra, extensão, conexão/cancelamento, desfazer, confirmação, reabertura atual/legada e preservação. Chamado por `scripts/test-light.cjs`. Resultado: `tests/dxf-operations-result.json`; imagem: `tests/dxf-operations.png`.

Relatório: `RELATORIO-DXF-3.1.4.md`. Backup do fonte anterior: `G:/GPT/backups/react-3.1.3-antes-edicao-dxf`. Entregas 3.1.3 e base 2.15.0 preservadas. Consultas sugeridas: `pnpm mapa:query --query "quebrar conectar eixo central dxf"` e `pnpm mapa:query --callers breakSegment`.

## Meia seção CAD nativa e navegação · 3.1.5

- `cadprofile.js:validate`, `compile`: perfil ordenado em Z/raio, continuidade de 0,001 mm, extremos analíticos dos arcos, raio não negativo e percurso sem retorno em Z. Mantém G2/G3 circular (subdivide somente arcos acima de 90° em arcos circulares), faces G1 e macros existentes de máquina. Não mistura `cadperfil` com elementos manuais.
- `dxfturn.js:build`: cadeia única de duas pontas, sem bifurcações; ordenação pela face, transformação exata e espelhamento do sentido dos arcos. Busca espacial de nós.
- `dxfprofile.js:analyze`, `svg`: seleciona apenas entidades inteiramente superiores; parte inferior tracejada, cinza e recortada. Projeção de edição sem sobrepor cotas numéricas; fonte/dimensões preservadas. `dxfedit.js:autoSelect` usa o mesmo limite superior estrito.
- `dxfaudit.js:check`: aceita o contorno nativo completo; mede seu comprimento, ignora cotas auxiliares como limitantes quando a geometria é válida e confere a face comum do interno. Perfis internos continuam restritos a cilindros/cones.
- `dxfimport.js`: `zoomCamera`, `fitCamera`, arraste da câmera independente da geometria; `makeDraft` dá ID ao rascunho; salvar preserva original mais delta e relaciona `cadOrigem.draftId`. `openSavedContour` reabre o rascunho exato; backup só de desenhos reconstitui contorno nativo sem inventar referência inferior. Edição não bloqueia por si só, mas invalida a confirmação para revisar a geometria resultante.
- `domain.mjs:drawingPreview`: prévia geométrica nativa independente de fixação; `core.js:psContorno` integra o perfil preservando as verificações de máquina. `Drawing.jsx` oferece Editar contorno no CAD; paleta manual permanece nos desenhos de elementos.
- G72 nativo exige X monotônico e recusa contornos que sobem e descem. Mesclagem de rascunhos remapeia IDs em colisão sem modificar os desenhos atuais. G71 nativo identifica contorno tipo II; desbaste do simulador permanece aproximado tipo I, explicitamente advertido. Raios/centros do acabamento são interpretados e conferidos; isso não constitui validação em torno real.
- `tests/cad-profile.test.cjs`: sete testes de cadeia, reflexo, arcos, falhas, SVG, prévia, fixação, G71/G73 e restrição de G72. `scripts/test-cad-half.cjs`: zoom/arraste reais, fonte/cotas/dados, meia seção, lacuna bloqueada, salvamento/reabertura completa e backup sem rascunho. Chamado pelo teste leve; `tests/cad-half-result.json` e `tests/cad-half.png`.

Backup anterior: `G:/GPT/backups/react-3.1.4-antes-meia-secao`. Entrega 3.1.4 e base 2.15.0 preservadas. Consulta sugerida: `pnpm mapa:query --query "meia secao superior zoom arco valido"`. Relatório: `RELATORIO-MEIA-SECAO-3.1.5.md`.

## Folga tangente e salvamento do Disco 7 · 3.1.6

- `dxfgeometry.js:repairEndpoints`: busca espacial de pontas selecionadas, até 0,01 mm; somente pares com vizinho único mútuo. Ancoragem da linha ao arco, mantendo arcos intactos. Linhas próximas entre si usam vértice existente; não move dois arcos nem encontros ambíguos. Retorna correções, distância máxima e remapeamento para histórico/delta.
- `dxfimport.js`: botão Ajustar conexões do perfil, desfazer e nova confirmação obrigatória. A lista de cadeias usa 0,001 mm, igual a `dxfprofile.js:connectivity` e `dxfturn.js:build`. `build` diagnostica pequenas folgas com medida e IDs. `dxfaudit.js:check` não aplica a auditoria antiga de intervalos retos quando há contorno nativo inválido: relata sua causa real.
- `tests/fixtures/disco-7-gap.json`: recorte geométrico derivado do DXF original, com a folga de 0,003064 mm do encontro F3/EB após quebra tangente. Face traseira mantém o limite original do furo (raio 7,1 mm); não precisa chegar ao eixo para validar. `tests/dxf-repair.test.cjs`: ajuste preserva quatro arcos, cadeia de 10 elementos/109,5 mm/Ø162,8 mm, simulação do contorno, limite/ambiguidade/seleção e arcos imutáveis.
- `scripts/test-disco-real.cjs`: teste Edge com banco temporário, usa o original em `_modelos exemplo` quando disponível e recorte portátil como alternativa. Executa apagar auxiliares, quebrar, estender ao eixo, selecionar, ajustar, desfazer, salvar e reabrir depois de recarregar. Mantém a fonte e os dados anteriores. Resultados e backup de exemplo em `tests/disco-*-result.json`; imagens `tests/disco-before.png`, `tests/disco-after.png`, `tests/disco-perfil.png`.

Backup anterior: `G:/GPT/backups/react-3.1.5-antes-disco-real`. Original DXF, pacote 3.1.5 e base 2.15.0 preservados. Consulta: `pnpm mapa:query --query "Disco folga tangente ajustar conexoes salvamento"`. Relatório: `RELATORIO-DISCO-3.1.6.md`.

## Etapas CAD, seleção e correções visíveis · 3.1.7

- `cad-panel.html`, `cad.css`: três seções com navegação por `data-dxf-go`, botões `data-dxf-mode`/`aria-pressed`, Desfazer e Ligar falhas na barra de ferramentas, câmera sobre o canto superior direito e ajuda no ?. Prévia e conferência na etapa Salvar desenho. Rascunhos em painel comum.
- `dxfimport.js:setStep`, `updateSteps`, `setMode`, `drawChains`: etapa 1 inicial, navegação guarda geometria/seleção/câmera; abertura de rascunho entra na edição quando há vista. Cadeias alternam seleção, desativam ferramentas incompatíveis e Mover com mouse. Seleção Externo/Interno explícita; modo neutro inspeciona sem modificar. Marcação/edição invalida confirmação, navegação simples mantém.
- `dxfgeometry.js:endpointConnections`, `linkGaps`: busca espacial e pares de vizinhos únicos mútuos; corrige apenas pontas de linhas a menos de 0,2 mm, respeitando erro numérico no limite. Não fecha pontas da mesma componente nem toca arcos. `repairEndpoints` mantém limite padrão de 0,01 mm para consumidores anteriores.
- `dxfprofile.js:svg`: linhas corrigidas verdes, encontros numerados, título/descrição com IDs e deslocamentos; referências inferiores cinzas/tracejadas. `dxfimport.js:markEdited`, `remember`, `makeDraft`, `openDraft` preservam/restauram `corrections` sem alterar a fonte. Auditoria após ajuste continua obrigatória com continuidade de 0,001 mm.
- `CadImport.jsx`: objeto estável `panelMarkup` mantém o DOM e seus handlers nas atualizações do banco React. `cad-test-flow.cjs` leva os testes anteriores à etapa visível usando os botões de navegação.
- `tests/dxf-repair.test.cjs`: limites 0,199999/0,2 mm, ambiguidades, mesma cadeia, delta e marcação SVG, além do Disco 7. `scripts/test-cad-stages.cjs`: cliques de cadeias com edição/pan ativos, alternância, etapas/volta, câmera/ajuda, falhas 0,199/0,2, ambiguidade, marcas/desfazer/salvar/reabrir e dados preservados. Resultado `tests/cad-etapas-result.json`; imagens `tests/cad-etapas-2.png` e `tests/cad-etapas-3.png`.

Backup anterior: `G:/GPT/backups/react-3.1.6-antes-etapas-cad`. Pacote 3.1.6 e base 2.15.0 preservados. Consulta: `pnpm mapa:query --query "etapas cad cadeias botoes ligar falhas"`. Relatório: `RELATORIO-ETAPAS-CAD-3.1.7.md`.

## Máquina e edição horizontal de ferramentas · 3.1.8

- `App.jsx`, `MachineSelector.jsx`: marca TORNO CNC e versão sem React, botão abaixo da versão, popup nativo com Fanuc/Siemens, Escape e retorno do foco. Salva somente `form.maq.comando`, preservando o banco e os parâmetros existentes. Seleção apenas identifica a máquina; geração atual preservada conforme resposta do usuário.
- `Tools.jsx`, `style.css`: cadastro horizontal em três colunas, grupos de identificação, incrementos/sobremetal, corte, observações e geometria. Campos numéricos/validação e metadados existentes mantidos. Em tela pequena o conteúdo continua acessível com rolagem. Orientação no cadastro de rosca/canal serve à prévia; escolhas e inferência do programa continuam prevalecendo na simulação.
- `tool-drawing.mjs:pecasFerr`, `svgFerr`, `ToolDrawing.jsx`: cabeça/haste de rosca interna redesenhadas com inserto junto à extremidade esquerda. Vista inferior espelhada apenas na apresentação, identificada no desenho; ponta de referência e polígono físico de corte não mudam. Mesmo SVG é usado na prévia do programa.
- `tests/tool-layout.test.cjs`: desenho ligado à cabeça, haste à direita e inserto equivalente ao motor. `scripts/test-machine-tools.cjs`: escolha/reabertura/Escape, programa idêntico, dados preservados, campos salvos, orientação persistida, telas 1366×768/1280×720 sem rolagem e tela pequena sem corte horizontal.

Backup anterior: `G:/GPT/backups/react-3.1.7-antes-maquina-ferramentas`. Consulta: `pnpm mapa:query --query "maquina comando fanuc siemens ferramentas"`. Relatório: `RELATORIO-MAQUINA-FERRAMENTAS-3.1.8.md`. Distribuição apenas leve; pacote 3.1.7 preservado.

## Conectar arcos/retas e ligar falhas circulares · 3.1.9

- `dxfgeometry.js:connectLines` aceita retas/arcos; `connectStraight` mantém o comportamento anterior entre duas retas. `supportMeetings` calcula interseções analíticas; `sameCircleMeeting` escolhe ponto intermediário entre extremos próximos de mesma circunferência. `extendToMeeting`, `arcEndpoint` ajustam extremos sem alterar círculo/sentido. Empate entre encontros distintos falha sem mutação. O ajuste pode encurtar a extremidade quando o encontro cai dentro da curva.
- `endpointConnections` e `repairEndpoints` mantêm o padrão legado. `linkGaps` habilita `allowArcs` com limite estrito de 0,2 mm. Entre arcos, prefere encontro circular próximo, sem criar arco completo nem comprimento nulo; limita também o percurso angular de cada correção. `bridgeEntity` cria trecho LINE curto explícito quando círculos não permitem encontro no limite. `bridgeSafe` impede cruzar outros elementos selecionados. Pares ambíguos e pontas de mesma componente permanecem intactos.
- `dxfimport.js:applyGeometry` herda seleção das ligações novas quando os dois elementos de origem eram do mesmo perfil. Clique aceita arcos; botão automático habilita pares arco/arco. Correções de ambas as funções usam os marcadores já existentes de `dxfprofile.js:svg`; texto diferencia mudança de extremidade e ligação reta criada. Cópia original, histórico, delta, confirmação, rascunho e salvamento preservados.
- `tests/dxf-arc-connections.test.cjs`: reta/arco nas duas ordens e sentidos, encontro interno, círculos tangentes/secantes/coincidentes, empate, limite, geometria oculta/ambígua, polilinhas e metadados, ponte explícita e reversível, perfil CNC e simulação. `scripts/test-dxf-arc-connections.cjs`: interação, seleção da ponte, verde, desfazer, duas curvas nativas e ligação salvas, reabertura e dados preservados. Adicionado à suíte `test-light.cjs`.

Consulta: `pnpm mapa:query --query "conectar linhas ligar falhas arcos"`; impacto de `public/engine/dxfgeometry.js`. Backup: `G:/GPT/backups/react-3.1.8-antes-conectar-arcos`. Relatório: `RELATORIO-CONEXOES-ARCOS-3.1.9.md`. Versões anteriores preservadas; distribuição apenas leve.

## Croqui de rosca externa e Nome ampliado · 3.1.10

- `tool-drawing.mjs:vistaFerr`, `svgFerr`: vista separada do polígono físico; haste vertical, cabeça chanfrada, inserto assentado no canto inferior esquerdo, parafuso e ombro. A mesma vista serve ao cadastro e à prévia do programa. Rosca interna e corte físico preservados.
- `Tools.jsx`, `style.css`, `ToolDrawing.jsx`: Nome e Pastilha ocupam a largura inteira da identificação; desenho de rosca externa tem área mais alta. Cadastro horizontal e persistência dos campos mantidos.
- `tests/tool-layout.test.cjs`: assentamento do inserto, haste vertical e corte inalterado. `scripts/test-machine-tools.cjs`: largura do Nome, nome longo salvo/reaberto, rosca externa sem rolagem em 1280×720 e regressões anteriores. Evidências: `tests/machine-tools-result.json`, `tests/ferramenta-rosca-externa.png`.
- `test-disco-real.cjs`, `test-cad-stages.cjs`: espera pelo CAD usa `globalThis.CNCDXFImport`, permitindo aguardar o carregamento assíncrono sem lançar ReferenceError. Suíte completa de interface e 80 testes unitários aprovados.

Backup: `G:/GPT/backups/react-3.1.9-antes-rosca-externa`. Consulta: `pnpm mapa:query --query "rosca externa haste vertical nome da ferramenta"`. Relatório: `RELATORIO-ROSCA-EXTERNA-3.1.10.md`. Entrega apenas leve; versão 3.1.9 preservada.

## Retângulo e movimento alinhados ao mouse · 3.1.11

- `dxfimport.js:viewPoint`: posição do mouse transformada por `getScreenCTM().inverse()`, incluindo margens de preserveAspectRatio, escala, rolagem e câmera. Compartilhada por delimitação da vista, exclusão e zoom ancorado.
- Eventos de pan guardam a matriz inversa no início e convertem o deslocamento nessa base fixa; movimento exato também com margens. Coordenadas CAD e dimensões não mudam.
- `scripts/test-cad-pointer.cjs`: arraste real no Edge, 2000×1200 e 1100×1000, faces dos dois lados, zoom/pan, seleção da vista, retângulo alinhado, somente linha alvo apagada, Desfazer e fonte/banco preservados. Integrado a `test-light.cjs`. Resultado `tests/cad-pointer-result.json`, imagem `tests/retangulo-mouse.png`; cópia isolada anterior reproduz deslocamento de 142 pixels.

Backup: `G:/GPT/backups/react-3.1.10-antes-retangulo-mouse`. Consulta: `pnpm mapa:query --query "apagar por retangulo mouse coordenadas"`. Relatório: `RELATORIO-RETANGULO-MOUSE-3.1.11.md`. Pacote 3.1.10 preservado; somente distribuição leve.

## Aviso de conexão e CAD com dois lados · 3.1.12

- `dxfprofile.js:svg`: seleção laranja e edição roxa prevalecem sobre verde; círculos transparentes, coincidências deduplicadas e anotação sem captura dos cliques. `dxfimport.js:showCorrectionNotice`, `positionCorrectionNotice`, `inspectCorrection`: aviso/seta por 3 segundos após ajuste ou aproximação do mouse, acompanhando câmera; conexões já existentes encerram a seleção sem edição.
- `cad-sides.mjs:reverseCadPath`, `clipCadPath`, `createOppositeCadSide`, `prepareCadSides`: dois perfis completos, inversão exata da face, recorte circular por comprimento, limites/cobertura e congruência conferidos. Internos passantes compatíveis; recusa inversão automática de internos parciais/complexos sem alterar dados.
- `Drawing.jsx`, `cad-panel.html`, `CadImport.jsx`: Criar lado 2 invertido ou salvar dois lados diretamente do DXF; metadados `cadDuplo` com limites e primeiro lado, metade inicial por opção do usuário. Abas/previsão completas. `dxfimport.js:openSavedContour`: lado escolhido/draftSide, nova revisão conserva os dois perfis após edição.
- `domain.mjs:generate`, `Generator.jsx`, `App.jsx`: limites aplicados somente aos percursos, ordem de preparação configurável, associa fixação/operação/sentidos/furo preexistente e identifica os lados físicos. Campos de bruto e verificações do motor mantidos.
- `tests/cad-sides.test.cjs`: 8 casos incluindo Disco 7, arcos, ordem, faixa faltante, congruência, fixação e geometria preservada. `scripts/test-cad-dual.cjs`: aviso de 3 segundos, cliques reais, cores, reabertura, limites, ordem, dois programas/simulação e salvamento direto; integrado a `test-light.cjs`. Resultados `tests/cad-dual-result.json`.

Backup: `G:/GPT/backups/react-3.1.11-antes-lados-cad-avisos`. Consulta: `pnpm mapa:query --query "lado 2 inverter lado circulo aviso 3 segundos"`. Relatório: `RELATORIO-CAD-DOIS-LADOS-3.1.12.md`. Versão 3.1.11 e dados reais preservados; somente distribuição leve.

## Enquadramento da usinagem interna · 3.1.13

- `simulation-view.mjs:simulationViewport`: janela fixa dos limites completos do bruto, contorno, cavidades/interiores/vazios e foco válido, margens e espaço para inserto interno junto ao eixo. Ignora pontos de troca e tamanho da placa para escala; zoom centrado.
- `Simulation.jsx:draw`: transformação compartilhada pelo Gerador e Simulação de programa. Ajustar restaura vista completa; código, trajetórias e simulação física inalterados.
- `tests/simulation-view.test.cjs`: reproduz recorte de Z−75 com foco externo Z−28, confere bruto/cavidades, estabilidade, não mutação, zoom e foco inválido. `scripts/test-simulation-view.cjs`: Edge temporário, transformação real do canvas, corte interno profundo, tela estreita, Ajustar e dados preservados; integrado em `test-light.cjs`.

Consulta: `pnpm mapa:query --query "simulador interno profundo enquadramento"`; impacto de `src/components/Simulation.jsx`. Backup: `G:/GPT/backups/react-3.1.12-antes-enquadramento-interno`. Relatório: `RELATORIO-SIMULADOR-INTERNO-3.1.13.md`. Pacote 3.1.12 e dados reais preservados; somente versão leve.

3.1.18: `Simulation.jsx` exibe corte, rápido e progresso em minutos (motor e velocidade continuam em segundos). `lightweight/Iniciar-CNC-Leve.vbs` abre o servidor oculto e cria o atalho local com `torno-cnc.ico`; CMD fica por compatibilidade. Use VBS ou TORNO CNC.lnk para não abrir console. Ícone CC0: `public/assets/torno-cnc-fonte.txt`. Relatório: `RELATORIO-MINUTOS-ABERTURA-ICONE-3.1.18.md`.

3.1.19: `App.jsx` renderiza `.autoria` no app; `style.css` fixa a marca no canto inferior direito. A referência recuperada está em `base-github-v2.15.0/Gerador/index.html`. Teste: `scripts/test-machine-tools.cjs`. Relatório: `RELATORIO-AUTORIA-3.1.19.md`.

3.1.20: GIF fornecido pelo usuário em public/assets/programas.gif, animação em App.jsx com preferência por movimento reduzido; style.css limita a 36 px. export-icon.cjs exporta sete resoluções do primeiro quadro PNG para o atalho; index.html usa favicon estático. Relatório: RELATORIO-ICONE-PROGRAMAS-3.1.20.md.

3.1.21: Configurações → Users.jsx (somente admin) → users.mjs:access → bridge do Servidor-CNC.ps1 → Usuarios-CNC.ps1:Invoke-UserAccess. Cadastro separado em users.json, permissões por módulo, PBKDF2 para senhas novas e tempo acumulado por usuário. Tick-User soma a união das sessões; pause/logout interrompem a contagem. App.jsx confere permissões ao renderizar e trocar de módulo; pulso verifica limite. Fallback no navegador usa cadastro local separado. Testes: tests/users.test.cjs e scripts/test-users.cjs.


## Canal com raio, bedame e colchetes FANUC · 3.1.25

- `Tools.jsx`, `tool-geometry-fields.mjs`: perfil reto, raio nas quinas e raio total automático (metade da largura). Bedame disponível com orientações frontal/externa/interna e quatro montagens físicas. Cadastro antigo preservado.
- `sim.js:grooveProfile`, `core.js:simTool`: mesma aresta arredondada no croqui e na remoção física; largura e referência programada preservadas. Raio do perfil separado do corretor de torneamento.
- `core.js:psContornoComCones`: deltas em #500..#503 antes da tangência, sem expansão repetida. `conferirColchetes` verifica cinco níveis, incluindo funções; `progsim.js` recusa excesso/desbalanceamento antes dos movimentos. Casos de regressão externos/internos com até dois níveis.
- `watch-map.cjs`: verificação periódica para unidades virtuais sem eventos de arquivo; `pnpm-workspace.yaml` usa hoisted. Graphify oficial local em `.tools`, fora da fonte ativa.
- 127 testes unitários, motores históricos e testes Edge específicos aprovados. Ensaios usam dados temporários. Relatório: `RELATORIO-CANAL-BEDAME-MACROS-3.1.25.md`. Backup em pasta `../backups/react-3.1.24-antes-canal-bedame-macros-20261015`; sem compactação.


## Assento no suporte, externo vertical e T padrão · 3.1.26

- `Tools.jsx`, `tool-geometry-fields.mjs`: inserto no centro/esquerda/direita da haste, orientação horizontal/vertical do externo e campo T padrão opcional de quatro dígitos. Usuário corrigiu o pedido para externo, no croqui e na animação.
- `tool-drawing.mjs:configuredParts`: mesmo suporte no cadastro e na animação; esquerda/direita mantidas na tela nas quatro montagens. Corte, referência e espessura preservados. `sim.js:configurableCut` conserva a geometria antiga ao ajustar apenas o suporte.
- `toolsetup.js:standardCode`, `slotSetup`, `programTool`: T0404 sugerido no Gerador e associação inequívoca na Simulação; montagem e associação explícitas do trabalho prevalecem. T histórico preservado sem migração automática.
- 133 testes unitários e Edge específico aprovados, incluindo salvar/reabrir, T0404/T0912, suporte vertical externo e animação em execução. Relatório: `RELATORIO-ASSENTO-SUPORTE-TPADRAO-3.1.26.md`. Backup: `../backups/react-3.1.25-antes-assento-suporte-tpadrao-20261015`; sem compactação.
