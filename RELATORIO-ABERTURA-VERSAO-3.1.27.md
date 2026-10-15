# Abertura da distribuição escolhida · 3.1.27

O servidor em execução apontava para `CNC-Torno-Leve-3.1.25`. Os HTMLs das distribuições 3.1.25 e 3.1.26 ainda tinham o título 3.1.24. O lançador comparava esse título e somente substituía a sessão ao detectar uma versão maior; abrir outra pasta podia continuar servindo os arquivos antigos.

A abertura passa a comparar a identidade carregada: pasta absoluta, versão e digest de `BUILD-REVISION.json`, SHA-256 do servidor e do módulo de usuários. A API autenticada `/api/revision` retorna a identidade capturada ao iniciar, mesmo quando os arquivos são atualizados depois. A mesma distribuição reutiliza a sessão; outra pasta, build ou servidor provoca uma troca após verificar PID, processo PowerShell e perfil de dados. Servidores anteriores sem a API também passam pela troca verificada. O reinício manual permanece disponível.

O título HTML e a versão da interface React são obtidos de `package.json`, evitando a divergência que ocorreu nesta entrega. As melhorias das versões 3.1.25 e 3.1.26 continuam incluídas.

`scripts/test-opening-light.cjs`, acessível por `pnpm test:abertura` e integrado a `pnpm test:ui`, reproduz título antigo idêntico, servidor sem identidade, reabertura, reinício manual, mesmo número de versão com outro build, outra pasta com o mesmo build, alteração do servidor e retorno a uma versão anterior. Compara os bytes de `workspace.json`, `workspace.json.previous` e `users.json` em perfil temporário. Confere no Edge o título, a versão visível e os campos de T padrão, orientação vertical e assento do inserto em outro perfil temporário completo. Nenhum teste usa o banco real.

Backup da fonte 3.1.26 e do Graphify anterior em `../backups/react-3.1.26-antes-correcao-abertura-20261015`. Entrega leve em pasta, sem compactação e com as distribuições anteriores preservadas. Graphify oficial atualizado após as alterações; o relatório e os manifestos ficam em `../graphify-atual/`.
