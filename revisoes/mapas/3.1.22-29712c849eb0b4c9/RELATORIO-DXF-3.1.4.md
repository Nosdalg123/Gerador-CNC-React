# Reconstrução DXF — versão leve 3.1.4

12/10/2026. Base CNC 2.15.0 mantida. Revisão atende ao pedido de quebra pelo eixo, dois modos de extensão, conexão por dois cliques, retirada da listagem de cotas e limpeza automática de duplicadas/sobrepostas.

## Comportamento

1. O eixo central Y CAD participa de quebra e extensão como construção infinita, inclusive quando Y=0. Não é exportado como elemento da peça.
2. Quebrar linha divide o elemento clicado em todos os cruzamentos da vista com linhas, arcos, círculos e eixo. Endpoints não geram pedaços vazios. Segmentos ocultados não são limitantes. As partes ficam disponíveis para seleção/apagamento individual.
3. Estender linha permite acrescentar milímetros em início/fim ou encontrar o primeiro encontro à frente dessa extremidade. Limites reais dos segmentos e arcos são respeitados. A extensão não usa uma aproximação poligonal dos arcos.
4. Conectar linhas solicita primeiro e segundo cliques; a primeira fica roxa. Linhas não paralelas são prolongadas até a interseção; em encontro em T, somente a linha ainda distante é prolongada. Colineares separadas encontram-se no meio da lacuna. Paralelas deslocadas e encontros já existentes não mudam a geometria. Cancelar seleção reinicia a operação.
5. Importação elimina duplicadas, inclusive com sentido invertido, e sobreposição parcial mantendo a maior inteira. Não mantém a sobra exclusiva da menor: ela é removida inteira por solicitação do usuário. Contatos e cruzamentos permanecem. A comparação usa tolerância geométrica de 0,000001 mm. Aplica-se a LINE, arestas de POLYLINE/LWPOLYLINE e arcos coincidentes; círculos duplicados também são removidos. SPLINE/ELLIPSE continuam exigindo revisão como antes.
6. Cotas e elementos reconhecidos deixou de ser uma seção da interface. DIMENSION, notas e outras entidades da fonte continuam preservadas; cotas ainda informam projeção, auditoria e comprimento sugerido.

## Preservação e compatibilidade

- Fonte original não é editada: painel 1 e `sourceDoc` preservam todas as entidades. Restaurar desenho original recupera a geometria anterior à limpeza, sem alterar o arquivo DXF no disco. Operações de edição têm desfazer.
- Somente polilinhas afetadas são convertidas para primitivas. Arcos mantêm centro, raio e orientação; IDs remapeados mantêm seleção/ocultação de vizinhos.
- Rascunho guarda uma fonte e um delta geométrico: entidades adicionadas/alteradas, removidas e ordem. Preserva limpeza, quebra, extensão, conexão, camadas, campos adicionais e exclusões. Formato antigo `lineEdits` continua abrindo; valores zero são mantidos.
- Confirmar CNC é invalidado após edição. O fluxo anterior de revisão CAD permanece; a limpeza e operações geométricas exigem conferência no editor manual antes de gerar.
- `%APPDATA%/CNC Torno React/workspace.json` e `.previous` não mudam. Os testes usam apenas perfil temporário. Dados reais não foram acessados nem migrados.
- Backup: `G:/GPT/backups/react-3.1.3-antes-edicao-dxf`. Pastas e ZIPs anteriores ficam preservados. A distribuição continua leve e offline.

## Validação

- `pnpm test`: 54 testes passaram, incluindo 17 novos testes de geometria.
- `pnpm test:legacy`: motores, PDFs e CAD passaram; interpretação 232 verificações e diagnóstico 313 verificações, sem falhas.
- `scripts/test-dxf-operations.cjs`: passou no Edge com cliques reais; verificou limpeza, eixo, extensões, conexão/cancelamento, desfazer, revisão, reabertura atual e antiga, cotas e dados existentes. Resultados em `tests/dxf-operations-result.json`.
- A distribuição é validada por `pnpm test:ui`, com PDF, sete geradores/croquis, simulação, CAD, montagem por elementos, raios em cones, persistência, backup e proteção contra alterações externas. Resultado da execução completa em `tests/light-result.json`.

## Mapa da revisão

Foi consultado antes da edição. Vocabulário CAD atualizado com quebra, conexão, eixo, duplicadas e sobreposição; inclui módulo geométrico e regressões. Consultas, build e empacotamento atualizam/arquivam o mapa. O pacote inclui índice, grafo, trilha, relatórios e manifesto em `mapa/`, vinculados ao mesmo digest do build. Relações globais são sinalizadas como inferidas; chamadas dinâmicas permanecem com limites explícitos.
