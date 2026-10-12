# Mapa persistente — versão leve 3.1.2

Implementação local inspirada no fluxo do Graphify, para reduzir releituras e orientar revisões do CNC Torno. Foi mantida a distribuição leve e preservados os motores, os dados, a base GitHub e as entregas anteriores.

## Recursos implementados

- **Grafo de chamadas e dependências:** AST Babel com escopo, imports/exports e aliases, funções, classes, callbacks, JSX e adaptação às factories UMD dos motores. Nós e relações têm caminho/linha; símbolos têm início/fim. Relações são `EXTRACTED`, `INFERRED` ou `AMBIGUOUS`. Chamadas sem destino estático conhecido são registradas, sem inventar dependências.
- **Consulta por assunto:** termos e sinônimos CNC revisados em `code-map.config.json`, com rotas e funções relevantes. Exemplos executados: “não perder meus desenhos”, “desenho com cotas da espina”, “empacotar versão leve” e “autenticação login”. A última localizou App, `can`, `navigate` e `useDrawing`; o impacto de App retornou main e index.html.
- **Atualização automática:** consultas, dev, build e package atualizam/confiram o mapa. Dev observa alterações; `pnpm mapa:watch` observa sem abrir o aplicativo. Cache SHA-256 reaproveita análises de arquivos intactos e invalida quando o analisador muda. Alterações/remoções e erros de sintaxe são detectados. Erro no fonte não é apresentado como extração completa.
- **Persistência de cada revisão:** `revisoes/mapas/<versão>-<hash>/` conserva índice, grafo, guia, trilha, conceitos, instruções e relatórios disponíveis, com manifesto SHA-256. Snapshots anteriores não são sobrescritos. Consultas são registradas em `revisoes/consultas.jsonl`.
- **Entrega da revisão atual:** o pacote leve inclui `mapa/`. O build grava `BUILD-REVISION.json`; package recusa build de outra revisão e verifica hashes/identificador do mapa entregue. Somente o snapshot atual entra no pacote; histórico e ferramentas Babel ficam no projeto.
- **Uso persistente:** os dois `AGENTS.md`, na raiz do workspace e do projeto, determinam consulta antes de editar e verificação/arquivo ao concluir. Isso orienta as próximas sessões neste workspace; não depende de lembrar esta conversa.
- **Tamanho:** JSONs de índice/grafo são compactados sem excluir campos. As consultas mostram somente resultados selecionados, em formato legível, evitando ler todo o grafo.

## Testes executados

`pnpm test`: **26 testes aprovados**, incluindo **12 testes do mapa**:

1. Imports com alias/default, JSX, escopo, callbacks; strings/comentários não geram chamadas falsas.
2. Globals UMD, construtor/protótipo e parâmetros dinâmicos.
3. Provedores globais múltiplos marcados como ambíguos.
4. Sinônimos por assunto e impacto transitivo.
5. Mudanças/remoções, cache incremental e preservação dos snapshots anteriores.
6. Adulteração do mapa detectada e corrigida; sintaxe inválida preserva a última revisão válida.
7. Observador atualiza após edição e ignora seus próprios arquivos, sem ciclo.
8. Globals sombreados e membros calculados não criam chamadas falsas; JSX namespace e import `?raw` resolvidos.
9. Retornos de callbacks comuns não são exportações; reexportação e TypeScript preservam dependências.
10. JSON gerado truncado e lock de processo encerrado recuperados.
11. Três processos simultâneos produzem uma única revisão íntegra.
12. Empacotamento inclui o mapa correto, recusa build antigo e detecta corrupção.

Os demais 14 testes cobrem os comportamentos e a preservação de dados já existentes. Build e empacotamento aprovados. O teste da distribuição leve no Edge também passou: sete geradores, 18 cotas, cálculo G, simulação, login, PDF, CAD, recursos offline e preservação de dados em perfil temporário. Resultados em `tests/light-result.json`, `tests/parity-light-result.json`, `tests/ui-result.json` e `tests/cad-ui-result.json`.

O mapa desta revisão cobre 97 arquivos, 1.820 símbolos, 3.965 chamadas resolvidas e 100 relações JSX. Os 5.470 registros não resolvidos incluem APIs externas/nativas e despacho dinâmico; não foram contados como chamadas com destino confirmado.

## Limites

A busca por assunto é local e baseada em vocabulário, nomes e rotas revisadas; **não usa embeddings nem interpretação por LLM**. PDFs têm inventário/hash, sem leitura multimodal como documentação. PowerShell tem declarações de funções e inventário, sem grafo completo de comandos. Bibliotecas externas, APIs nativas, despacho dinâmico e membros calculados podem ficar sem destino resolvido; isso não significa que sejam defeitos do aplicativo. Resolução estática não demonstra execução.

Não foi instalado/executado Graphify, nem foi medido consumo de tokens. A implementação oferece os recursos descritos acima, sem afirmar equivalência integral ou redução de 71 vezes. `TESTE-TRILHA-CODIGO.md` permanece como registro da auditoria anterior.

## Referências usadas no estudo

[Graphify — README oficial](https://raw.githubusercontent.com/safishamsi/graphify/main/README.md): grafo persistente, evidência de relações, consultas e atualização. [Babel Parser](https://babeljs.io/docs/babel-parser) e [Babel Traverse](https://babeljs.io/docs/babel-traverse): análise AST e escopo adotados na implementação local.
