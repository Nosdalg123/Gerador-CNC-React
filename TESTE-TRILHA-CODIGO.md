# Teste da trilha e do índice do projeto

> **Registro histórico, anterior à versão 3.1.2.** As limitações abaixo descrevem o indexador antigo. A implementação atual, com grafo AST, consultas e atualização automática, está em `RELATORIO-MAPA-3.1.2.md` e `MAPA-CODIGO.md`. Este relatório foi preservado para manter a trilha da auditoria.

Auditoria realizada após a escolha da distribuição leve como padrão.

## Resultado

Existe um mapa salvo e útil para navegação, mas ele não implementa todas as funções do Graphify. A versão React usa `TRILHA-REACT.md` e `PROJECT_INDEX.json`, gerado por `scripts/index.cjs`. Um grafo mais detalhado existe em `G:\GPT\analise-v2.11.0`, porém descreve exclusivamente a base antiga 2.11.0.

## Testes efetivamente executados

| Verificação | Resultado |
|---|---|
| Existência dos arquivos da trilha e índice React | Aprovada |
| Hash SHA-256 e tamanho dos 81 arquivos originalmente indexados | Todos conferiram; nenhum ausente ou alterado |
| Busca de `DimensionedDrawing` | Localizou `src/components/DimensionedDrawing.jsx` e o import do JSON dos croquis |
| Busca de `generate`, `numericFields` e `programTool` | Localizou `src/domain.mjs` |
| Busca de `svgFerr` | Localizou `src/assets/tool-drawing.mjs` |
| Busca de `mergeWorkspace` | Localizou `src/data.mjs` |
| Conferência das seis buscas no fonte | Aprovada |
| `python gerar-trilha.py --check` na análise antiga | Todos os hashes conferiram |
| Consulta antiga de `psLado` | Localizou `Gerador/core.js`, linhas 2024–2596 |
| Consulta antiga por conceito `pdf` | Retornou sete módulos relacionados |
| Consulta antiga de impacto de `core.js` | Retornou consumidores potenciais transitivos, com ressalva explícita de que referências não comprovam uso em execução |

Os 81 arquivos são a contagem antes desta auditoria. O relatório e a revisão da trilha acrescentam documentação; o índice foi regenerado ao final.

## Limitações encontradas

- O indexador React extrai nomes com expressões regulares; não faz análise AST completa ou resolução de escopo.
- Não guarda faixas de linhas, grafo de chamadas, relações entre funções ou ligações dos globais CNC com seus motores.
- Consultas semânticas, interpretação de PDFs/imagens como documentação e atualização automática por observação de arquivos não estão implementadas nesse índice.
- `package.json` e `BASE-GITHUB.json` não são incluídos pelo filtro atual. Portanto, hashes conferidos não significam cobertura de todos os arquivos do projeto. `PROJECT_INDEX.json` também fica fora do próprio índice.
- A tabela principal da trilha ainda apontava para persistência/empacotamento Electron. Essas rotas foram corrigidas para a versão leve, junto com as instruções de acesso ao disco e os testes vigentes.
- Não foi instalado ou executado o Graphify nesta auditoria, nem foi medido consumo de tokens. Não há evidência de redução de 71 vezes neste projeto.

O [README oficial do Graphify](https://raw.githubusercontent.com/safishamsi/graphify/main/README.md), consultado na auditoria, documenta grafo persistente consultável, análise AST/chamadas, conceitos de documentos e imagens e atualização por `--watch`/hooks. A alegação de 71,5 vezes vem dos benchmarks do próprio projeto e depende do corpus. Nosso mapa local atende parcialmente ao objetivo de reduzir releituras, sem equivalência comprovada a esses recursos.

## Uso na próxima manutenção

1. Ler `AGENTS.md` e `TRILHA-REACT.md`.
2. Consultar no `PROJECT_INDEX.json` os nomes de funções e imports ligados à tarefa.
3. Confirmar as relações no código atual, especialmente chamadas por globais e callbacks.
4. Após alterações, executar `node scripts/index.cjs`.

Nenhum motor CNC, pacote executável ou dado do usuário foi alterado nesta auditoria.
