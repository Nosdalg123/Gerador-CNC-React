# Mapa do código — versão 3.1.25

Revisão: `1d983eaa9c1d93e065b06ca7c5b2f8290e18f4434c39b607376dca405d2659fb`. 177 arquivos, 3028 símbolos, 5924 chamadas resolvidas e 131 relações JSX.

Leia AGENTS.md e TRILHA-REACT.md antes de qualquer revisão. O índice tem hashes e faixas de linhas; GRAFO-CODIGO.json contém relações e evidências.

- Atualizar e arquivar: `pnpm mapa`
- Conferir integridade: `pnpm mapa:check`
- Buscar assunto: `pnpm mapa:query --query "não perder meus desenhos"`
- Localizar função: `pnpm mapa:query --symbol generate`
- Quem chama: `pnpm mapa:query --callers numericFields`
- O que chama: `pnpm mapa:query --callees generate`
- Impacto: `pnpm mapa:query --impact public/engine/core.js`
- Observar arquivos: `pnpm mapa:watch`

Consultas atualizam o mapa antes de responder. Dev/build/package também atualizam; cada conteúdo diferente gera snapshot em revisoes/mapas. O pacote leve inclui a revisão em mapa/.

## Limites e evidência

EXTRACTED: referência resolvida pelo AST/escopo. INFERRED: alias global ou associação de conceito revisada. AMBIGUOUS: mais de um destino. 11043 chamadas externas/dinâmicas não foram resolvidas e estão registradas. Callbacks e funções anônimas têm nós próprios. Resolução estática não prova execução.

A busca por assunto usa vocabulário de CNC e texto local, sem LLM ou embeddings. Não interpreta imagens/PDFs como documentação semântica. PowerShell tem inventário e declaração de função, sem grafo completo de comandos. Não há promessa de redução de tokens medida.

## Assuntos

- **Canal com raio, bedame e limite de colchetes FANUC**: `src/components/Tools.jsx`, `src/tool-geometry-fields.mjs`, `src/components/ToolDrawing.jsx`, `src/components/Program.jsx`, `public/engine/core.js`, `public/engine/sim.js`, `public/engine/progsim.js`, `public/engine/toolsetup.js`, `tests/groove-bedame-macros.test.cjs`, `scripts/test-groove-bedame.cjs`
- **Geometria e suporte configuráveis: inserto, haste, montagem física e κ**: `src/components/Tools.jsx`, `src/tool-geometry-fields.mjs`, `src/assets/tool-drawing.mjs`, `public/engine/core.js`, `public/engine/sim.js`, `public/engine/toolsetup.js`, `src/components/Simulation.jsx`, `tests/tool-geometry.test.cjs`, `scripts/test-tool-geometry.cjs`
- **Animação, montagem e posição dos insertos no simulador**: `src/components/Simulation.jsx`, `src/assets/tool-drawing.mjs`, `src/components/ToolDrawing.jsx`, `public/engine/sim.js`, `public/engine/simulation-worker.js`, `src/components/Program.jsx`, `public/engine/toolsetup.js`, `tests/tool-animation.test.cjs`, `scripts/test-tool-animation.cjs`
- **Simulação responsiva, montagem por trabalho e compensação do corretor**: `src/components/Program.jsx`, `src/components/Simulation.jsx`, `src/use-worker-job.mjs`, `public/engine/simulation-worker.js`, `public/engine/toolsetup.js`, `src/tool-setup.mjs`, `src/domain.mjs`, `src/components/Generator.jsx`, `public/engine/progsim.js`, `public/engine/sim.js`, `public/engine/core.js`, `tests/simulation-corrections.test.cjs`, `scripts/test-simulation-corrections.cjs`
- **Montar peças por elementos e arredondar quinas**: `src/components/Drawing.jsx`, `src/components/PieceBuilder.jsx`, `src/piece-elements.mjs`, `src/assets/element-drawings.mjs`, `src/domain.mjs`, `public/engine/core.js`
- **Desenhos cotados e medidas**: `src/components/DimensionedDrawing.jsx`, `src/assets/dimensioned-drawings.json`, `src/components/Generator.jsx`, `src/domain.mjs`
- **Autenticação, sessão e permissões locais**: `src/App.jsx`, `src/main.jsx`, `index.html`, `scripts/test-ui.cjs`, `scripts/test-cad.cjs`, `scripts/test-parity-ui.cjs`
- **Preservar e recuperar dados**: `src/data.mjs`, `src/App.jsx`, `src/components/Backup.jsx`, `lightweight/Servidor-CNC.ps1`
- **Gerar programa CNC**: `src/components/Generator.jsx`, `src/domain.mjs`, `public/engine/core.js`
- **Simular corte, colisão e percurso**: `src/components/Simulation.jsx`, `src/simulation-view.mjs`, `tests/simulation-view.test.cjs`, `scripts/test-simulation-view.cjs`, `src/components/Program.jsx`, `public/engine/sim.js`, `public/engine/progsim.js`, `public/engine/diagnostico.js`
- **Importar e revisar desenho PDF**: `src/components/PdfImport.jsx`, `src/pdf-state.mjs`, `public/engine/pdfdimensions.js`, `public/engine/pdfvector.js`, `public/engine/pdfprofile.js`, `public/engine/pdforientation.js`
- **Editar, importar e revisar CAD DXF**: `src/components/CadImport.jsx`, `src/components/Drawing.jsx`, `public/engine/dxfimport.js`, `public/engine/dxfedit.js`, `public/engine/dxfcore.js`, `public/engine/dxfprofile.js`, `public/engine/dxfgeometry.js`, `src/assets/cad-panel.html`, `tests/dxf-geometry.test.cjs`, `scripts/test-dxf-operations.cjs`, `scripts/test-cad-pointer.cjs`
- **Banco, giro e formato das ferramentas**: `src/components/Tools.jsx`, `src/components/ToolDrawing.jsx`, `src/assets/tool-drawing.mjs`, `src/domain.mjs`, `public/engine/seed.js`
- **Executar e distribuir a versão leve**: `lightweight/Servidor-CNC.ps1`, `lightweight/Iniciar-CNC-Leve.cmd`, `scripts/package-light.cjs`, `scripts/test-light.cjs`, `package.json`
- **Consultar, conferir e atualizar o mapa**: `scripts/code-map.cjs`, `scripts/query-map.cjs`, `scripts/watch-map.cjs`, `scripts/index.cjs`, `code-map.config.json`, `TRILHA-REACT.md`, `AGENTS.md`
- **Meia seção superior CAD nativa, zoom e movimentação**: `public/engine/cadprofile.js`, `public/engine/dxfturn.js`, `public/engine/dxfprofile.js`, `public/engine/dxfaudit.js`, `public/engine/dxfimport.js`, `public/engine/core.js`, `src/domain.mjs`, `src/components/Drawing.jsx`, `src/assets/cad-panel.html`
- **Disco 7: folga tangente, ajuste de conexões e salvamento**: `public/engine/dxfgeometry.js`, `public/engine/dxfturn.js`, `public/engine/dxfprofile.js`, `public/engine/dxfaudit.js`, `public/engine/dxfimport.js`, `src/assets/cad-panel.html`, `tests/dxf-repair.test.cjs`, `scripts/test-disco-real.cjs`
- **Etapas CAD, seleção de cadeias e ligação de falhas**: `src/assets/cad-panel.html`, `src/assets/cad.css`, `src/components/CadImport.jsx`, `public/engine/dxfimport.js`, `public/engine/dxfgeometry.js`, `public/engine/dxfprofile.js`, `scripts/test-cad-stages.cjs`, `scripts/cad-test-flow.cjs`, `tests/dxf-repair.test.cjs`
- **Selecionar máquina e editar ferramentas por grupos**: `src/App.jsx`, `src/components/MachineSelector.jsx`, `src/components/Tools.jsx`, `src/components/ToolDrawing.jsx`, `src/assets/tool-drawing.mjs`, `src/style.css`, `scripts/test-machine-tools.cjs`, `tests/tool-layout.test.cjs`
- **Conectar arcos e retas e ligar falhas circulares**: `public/engine/dxfgeometry.js`, `public/engine/dxfimport.js`, `public/engine/dxfprofile.js`, `src/assets/cad-panel.html`, `tests/dxf-arc-connections.test.cjs`, `scripts/test-dxf-arc-connections.cjs`
- **CAD com lado 2 invertido e aviso de conexão**: `src/cad-sides.mjs`, `src/components/Drawing.jsx`, `src/components/Generator.jsx`, `src/components/CadImport.jsx`, `src/domain.mjs`, `public/engine/dxfimport.js`, `public/engine/dxfprofile.js`, `src/assets/cad.css`, `tests/cad-sides.test.cjs`, `scripts/test-cad-dual.cjs`, `src/cad-document.mjs`, `src/data.mjs`, `RELATORIO-CAD-LADOS-GERADOR-3.1.15.md`
- **Preparação CAD, face Z0 e pendências antes de salvar**: `src/assets/cad-panel.html`, `public/engine/dxfimport.js`, `public/engine/dxfaudit.js`, `scripts/test-cad-stages.cjs`, `RELATORIO-PREPARACAO-CAD-3.1.14.md`
- **Comprimentos independentes e bloqueio de rampas e frestas no CAD**: `public/engine/cadprofile.js`, `public/engine/core.js`, `src/cad-sides.mjs`, `src/components/Generator.jsx`, `tests/cad-machining-safety.test.cjs`, `scripts/test-cad-machining-safety.cjs`, `RELATORIO-SEGURANCA-CAD-3.1.16.md`, `RELATORIO-CILINDRAGEM-PROTEGIDA-3.1.17.md`
- **Tempos em minutos, abertura sem terminal e ícone do torno**: `src/components/Simulation.jsx`, `lightweight/Iniciar-CNC-Leve.vbs`, `lightweight/Iniciar-CNC-Leve.cmd`, `scripts/package-light.cjs`, `public/assets/torno-cnc.svg`, `public/assets/torno-cnc-fonte.txt`, `scripts/export-icon.cjs`, `RELATORIO-MINUTOS-ABERTURA-ICONE-3.1.18.md`
- **Marca de autoria no canto inferior direito**: `src/App.jsx`, `src/style.css`, `scripts/test-machine-tools.cjs`, `RELATORIO-AUTORIA-3.1.19.md`
- **Usuários, permissões por módulo e tempo acumulado de uso**: `src/App.jsx`, `src/users.mjs`, `src/components/Users.jsx`, `lightweight/Usuarios-CNC.ps1`, `lightweight/Servidor-CNC.ps1`, `scripts/test-users.cjs`, `tests/users.test.cjs`
