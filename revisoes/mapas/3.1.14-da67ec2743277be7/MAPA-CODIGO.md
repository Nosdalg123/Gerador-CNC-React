# Mapa do código — versão 3.1.14

Revisão: `da67ec2743277be7ffc5816aa62e99ed1a4a0710f6f1cb2836a3557cac0475ee`. 138 arquivos, 2649 símbolos, 5551 chamadas resolvidas e 116 relações JSX.

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

EXTRACTED: referência resolvida pelo AST/escopo. INFERRED: alias global ou associação de conceito revisada. AMBIGUOUS: mais de um destino. 9002 chamadas externas/dinâmicas não foram resolvidas e estão registradas. Callbacks e funções anônimas têm nós próprios. Resolução estática não prova execução.

A busca por assunto usa vocabulário de CNC e texto local, sem LLM ou embeddings. Não interpreta imagens/PDFs como documentação semântica. PowerShell tem inventário e declaração de função, sem grafo completo de comandos. Não há promessa de redução de tokens medida.

## Assuntos

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
- **CAD com lado 2 invertido e aviso de conexão**: `src/cad-sides.mjs`, `src/components/Drawing.jsx`, `src/components/Generator.jsx`, `src/components/CadImport.jsx`, `src/domain.mjs`, `public/engine/dxfimport.js`, `public/engine/dxfprofile.js`, `src/assets/cad.css`, `tests/cad-sides.test.cjs`, `scripts/test-cad-dual.cjs`
- **Preparação CAD, face Z0 e pendências antes de salvar**: `src/assets/cad-panel.html`, `public/engine/dxfimport.js`, `public/engine/dxfaudit.js`, `scripts/test-cad-stages.cjs`, `RELATORIO-PREPARACAO-CAD-3.1.14.md`
