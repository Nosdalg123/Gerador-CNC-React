# CNC Torno — versão leve como padrão

## Decisão persistente do usuário

Em 11/10/2026, o usuário determinou: “daqui em diante vamos usar apenas a versão leve, mesmo nas próximas modificações”.

- Desenvolva, valide e entregue somente a distribuição leve. Não gere nem execute novos pacotes Electron, salvo se o usuário mudar expressamente essa decisão.
- Preserve fontes, executáveis anteriores, backups, base GitHub e dados existentes. A mudança de padrão não autoriza exclusão de arquivos.
- A interface React e os motores CNC continuam os mesmos. Preserve os recursos offline de PDF/DXF, os croquis cotados, simulação, ferramentas, importação e backups.
- Para abrir, use `Iniciar-CNC-Leve.cmd` ou `pnpm start`. `pnpm desktop` também aponta para o lançador leve.
- Para construir, execute `pnpm build`; para empacotar, `pnpm package` (`scripts/package-light.cjs`). A distribuição fica em `release/CNC-Torno-Leve`.
- Para testes pertinentes de interface/persistência, use `pnpm test:ui` (`scripts/test-light.cjs`), que usa Edge e perfil temporário. Não rode testes contra o banco real. Use `pnpm test` e `pnpm test:legacy` conforme a mudança.
- A versão leve usa `lightweight/Servidor-CNC.ps1` com servidor em loopback e navegador instalado. Preserve o caminho `%APPDATA%\CNC Torno React\workspace.json`, a cópia `.previous` e a proteção contra sobrescrita por outra sessão.
- Mantenha a trilha e o mapa conforme o fluxo obrigatório abaixo.

Os arquivos `electron/` e `scripts/package.cjs` ficam como histórico e referência; não são o caminho padrão de execução ou entrega.

## Uso obrigatório do mapa em cada revisão

Pedido explícito do usuário em 11/10/2026: manter o mapa disponível em cada revisão e sempre usá-lo para aumentar a eficiência.

1. Antes de editar código, leia `MAPA-CODIGO.md` e `TRILHA-REACT.md`. Execute `pnpm mapa:query --query "assunto da tarefa"`; a consulta atualiza e confere o mapa automaticamente. Consulte `--symbol`, `--callers`, `--callees` ou `--impact` nos pontos relevantes. Confirme as faixas indicadas no fonte. Evite reler todo o grafo ou o projeto quando uma consulta específica bastar.
2. Use somente o mapa desta pasta. O grafo em `G:/GPT/analise-v2.11.0` é histórico. Relações `INFERRED` e `AMBIGUOUS`, callbacks, chamadas dinâmicas e PowerShell exigem conferência no código; extração estática não demonstra execução.
3. Mantenha `code-map.config.json` e a trilha quando mudar recursos/rotas do domínio. Buscas por assunto usam vocabulário local revisado, sem embeddings ou serviço externo.
4. Durante desenvolvimento, `pnpm dev` observa alterações. Fora dele, use `pnpm mapa:watch` se precisar de atualização contínua. `pnpm mapa`, consultas, build e package também atualizam automaticamente.
5. Ao concluir, rode os testes pertinentes, `pnpm mapa` e `pnpm mapa:check`. Toda fonte/documentação diferente gera uma cópia imutável em `revisoes/mapas/<versão>-<hash>/`, com `REVISAO.json`. Não apague ou sobrescreva revisões anteriores. As consultas ficam registradas em `revisoes/consultas.jsonl`.
6. Para entregar, execute `pnpm build` e `pnpm package`. O pacote contém `mapa/` com índice, grafo, guia, trilha, configuração, estas instruções e manifesto. Empacotamento recusa build de outra revisão ou mapa inconsistente. Se editar fontes/documentação após o build, reconstrua antes de entregar. Preserve os ZIPs anteriores.

O mapa é ferramenta de navegação; o comportamento deve ser confirmado nos trechos encontrados e nos testes pertinentes. Não invente medições de economia de tokens.
