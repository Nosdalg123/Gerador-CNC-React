# Correções da revisão find-bugs · 3.1.28

As cinco falhas reproduzidas na revisão 3.1.27 foram corrigidas na fonte ativa. A entrega continua sendo a distribuição leve local. Dados e credenciais existentes permanecem no perfil `%APPDATA%/CNC Torno React`; não há migração destrutiva nem substituição do banco durante a instalação.

## F1 — Identificação só produz comentário CNC

`core.js:cabecalhoPrograma` aplica `ascii()` também à data manual. Parênteses e caracteres de controle não conseguem encerrar o comentário nem criar um bloco CNC adicional. A verificação cobre o formulário e dados importados, pois a proteção está no ponto central de emissão.

## F2 — Dados exigem sessão e respeitam os módulos

`Workspace-CNC.ps1:Get-WorkspaceUser` exige sessão válida nas rotas de leitura/gravação e verifica o tempo de uso. O token da aplicação continua protegendo origem e comunicação local, e não substitui o login de usuário. O gerenciamento de usuários mantém sua proteção própria de administrador.

As gravações comparam os campos alterados com o workspace atual. Ferramentas exigem Ferramentas; programa exige Simulação; rascunhos CAD exigem CAD; desenho e rascunho podem ser salvos pelos módulos de Desenho/PDF/CAD. Os campos de configuração exigem Configurações; seleções de usinagem seguem os módulos correspondentes. Tema e identificação global Fanuc/Siemens mantêm seu uso na interface. Administrador e Dados/backup podem importar o workspace completo; as credenciais continuam separadas em `users.json`.

`use-workspace.mjs` carrega os dados após autenticar. A inicialização de um perfil vazio usa `DEFAULT-WORKSPACE.json`, gerado com os valores padrão da própria distribuição, e só ocorre após o login. Um banco já existente não é substituído por esse arquivo. O modo de navegador mantém o cadastro de acesso fora dos extras do workspace inicial.

## F3 — Conflito entre janelas não sobrescreve dados

Cada leitura entrega uma ETag da revisão carregada; cada gravação precisa apresentar a mesma revisão em `If-Match`. Uma cópia antiga recebe HTTP 409. A proteção anterior contra alterações externas ao servidor e a gravação atômica com `.previous` permanecem.

A bridge e a interface serializam as gravações da mesma janela. Ao ocorrer conflito ou outra falha de gravação, as alterações ficam na janela e podem ser exportadas antes de recarregar os dados salvos. Não há renovação automática da revisão para tentar sobrescrever a outra janela. A saída da sessão aguarda a fila de gravação, e alterações pendentes acionam a proteção de fechamento. Uma resposta atrasada da sessão anterior não substitui a sessão atual na bridge.

## F4 — Montagem conjunta da torre é validada

`toolsetup.js:validateMountings` verifica as ferramentas efetivamente utilizadas, após aplicar o T padrão e os ajustes do trabalho. Geometrias incompatíveis na mesma estação bloqueiam a emissão do programa, mesmo com corretores diferentes. Reuso da mesma geometria com parâmetros de corte diferentes continua permitido. O erro identifica a estação e os papéis conflitantes.

## F5 — Referências importadas acompanham os novos IDs

`data.mjs:mergeWorkspace` separa os mapas de IDs de ferramentas e desenhos. A associação `program.ferr` do programa importado acompanha o novo ID da ferramenta. Seleções, programa e rascunho atuais que não foram substituídos pela importação conservam suas referências anteriores. Dados de entrada não são mutados.

## Verificação

As regressões estão em `tests/security-fixes.test.cjs`, `scripts/test-workspace-security.cjs` e `scripts/test-security-ui.cjs`, além das suítes existentes. Os testes de API exigem autenticação também no modo de teste: não há desvio que desabilite a proteção. Os helpers de fixtures obtêm explicitamente uma revisão atual antes de uma restauração deliberada pelo administrador; os testes de conflito usam clientes estritos e mantêm a revisão antiga para conferir a rejeição.

Os perfis temporários de teste usam um identificador aleatório, evitando que um PID reutilizado recupere a base de um teste anterior. Reabertura explícita de um perfil temporário continua disponível para os ensaios de persistência.

Validações da liberação: testes unitários, motores históricos, autenticação/cota/permissões, conflito de duas janelas com exportação e recarga, regressão completa da interface leve, build, package e integridade do mapa. Ensaios usam dados temporários e não enviam comandos a uma máquina física.

O Graphify oficial e o mapa local são atualizados após as correções; a distribuição inclui o mapa da revisão correspondente. Backup da fonte e do grafo anteriores: `../backups/react-3.1.27-antes-correcoes-find-bugs-20261019`. Entrega em pasta, sem arquivo compactado adicional e com as distribuições anteriores preservadas.
