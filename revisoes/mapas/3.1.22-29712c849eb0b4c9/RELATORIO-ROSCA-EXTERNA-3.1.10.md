# Rosca externa e nome da ferramenta · versão leve 3.1.10

O croqui de rosca externa tinha uma haste horizontal e o inserto triangular solto abaixo do suporte. A vista agora mostra haste vertical, cabeça com chanfro, inserto assentado no canto inferior esquerdo e parafuso no centro do inserto, seguindo as referências fornecidas. Mantém as cores, traços, legenda e marca de ponta existentes. A mesma vista é reutilizada no cadastro e na prévia de ferramentas do programa.

`vistaFerr` separa a apresentação da geometria física: a rotação do inserto e a nova cabeça pertencem somente ao SVG. O polígono usado pelo simulador, parâmetros de corte e programas gerados permanecem preservados. A vista de rosca interna continua com sua apresentação anterior.

Nome e Pastilha ocupam toda a largura do grupo Identificação, com Número T e Tipo na linha intermediária. Nome passa a ter aproximadamente o dobro da largura anterior. A edição mantém a validação, o ID e os demais campos do registro.

Validação unitária: 80 testes aprovados, incluindo inserto assentado na cabeça, haste vertical e geometria física preservada. O teste de interface usa Edge e banco temporário; confere cadastro sem rolagem em 1366×768 e 1280×720, largura do Nome, salvamento/reabertura de nome longo, seleção de orientação e regressões de CAD, geração e persistência. Evidências em `tests/machine-tools-result.json` e `tests/ferramenta-rosca-externa.png`.

`pnpm test:ui` aprovado integralmente, com resultado sem erros de página; inclui o Disco 7 original, conexões entre arcos e retas, etapas CAD, peças por elementos e preservação. A espera dos testes `test-disco-real.cjs` e `test-cad-stages.cjs` foi corrigida para consultar `globalThis.CNCDXFImport` durante o carregamento assíncrono, evitando uma exceção antes de o módulo existir. Nenhum comportamento CAD foi alterado por esse ajuste de teste.

Fontes: `src/assets/tool-drawing.mjs`, `src/components/ToolDrawing.jsx`, `src/components/Tools.jsx`, `src/style.css`. Trilha e vocabulário do mapa atualizados; pacote inclui o mapa correspondente ao build. Backup anterior: `G:/GPT/backups/react-3.1.9-antes-rosca-externa`. Distribuição 3.1.9, base histórica, DXF original e dados reais preservados.
