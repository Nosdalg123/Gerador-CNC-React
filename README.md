# TORNO CNC — 3.1.16 · versão leve

Comprimentos dos lados são independentes no Gerador: uma região central sem usinagem gera aviso, sem bloquear ou redistribuir valores. A geração CAD impede acabamento em rampas/frestas atrás de material não desbastado, com posição Z e dica para limitar o lado. O retorno rápido não é parte do perfil acabado. Relatório: RELATORIO-SEGURANCA-CAD-3.1.16.md.

O CAD DXF gera a prévia do lado 2 invertido na etapa 3 e mostra botões com miniaturas para conferir ambos os lados. Os dois perfis completos ficam gravados no desenho; os comprimentos a usinar são definidos no **Gerador de código**, inicialmente metade por lado. As caixas de seleção ficam em linhas separadas. Reabrir e salvar o lado 2 preserva a identidade do desenho e suas configurações. Relatório: `RELATORIO-CAD-LADOS-GERADOR-3.1.15.md`.

Na etapa **2 · Editar desenho**, escolha **Face Z0 voltada à ferramenta** e confira o comprimento. A etapa 3 exige o perfil preparado; se houver pendências, o editor lista o problema e como corrigi-lo. Rascunhos incompletos podem ser conservados na etapa 2. Detalhes em `RELATORIO-PREPARACAO-CAD-3.1.14.md`.

Repositório: [Nosdalg123/Gerador-CNC-React](https://github.com/Nosdalg123/Gerador-CNC-React). O pacote pronto fica em `distribuicoes/CNC-Torno-Leve-3.1.16.zip`: baixe, extraia toda a pasta e execute `Iniciar-CNC-Leve.cmd`. O mapa atual fica na raiz e acompanha o pacote; mapas históricos estão disponíveis em `revisoes/mapas-arquivados/*.zip`, com os manifestos originais. Para consultá-los, extraia o ZIP da revisão desejada. Os dados de trabalho permanecem no computador do usuário.

O simulador enquadra a peça completa e as cavidades internas, inclusive quando o interno é mais profundo que o perfil externo. A vista permanece fixa durante a troca de ferramenta; **Ajustar** restaura o enquadramento completo e o zoom mantém o centro da peça. Relatório: `RELATORIO-SIMULADOR-INTERNO-3.1.13.md`.

O círculo verde marca uma conexão corrigida; um aviso com seta explica o encontro por 3 segundos. A cor de seleção prevalece e conectar linhas já unidas libera a seleção sem alterar a peça.

Para dois lados, marque **Salvar também lado 2 invertido** ao salvar o DXF, ou use **Criar lado 2 invertido** em Desenho da peça. Salve os dois perfis completos; ajuste os comprimentos no Gerador de código (metade por lado inicialmente). No Gerador, escolha **Primeiro lado a usinar** e use os botões Lado 1/Lado 2 para código e simulação. Detalhes em `RELATORIO-CAD-DOIS-LADOS-3.1.12.md`.

Apagar por retângulo acompanha o cursor também em quadros com margens, zoom e desenho movido. A mesma correção alinha a delimitação da vista e o movimento do desenho. Detalhes em `RELATORIO-RETANGULO-MOUSE-3.1.11.md`.

Rosca externa: croqui com haste vertical e inserto assentado na cabeça, conforme as referências. No cadastro, Nome e Pastilha ocupam toda a largura do grupo Identificação. A apresentação não altera a geometria de corte nem a geração CNC. Detalhes em `RELATORIO-ROSCA-EXTERNA-3.1.10.md`.

Versão local criada a partir da base GitHub 2.15.0, com as correções anteriores mantidas. O ZIP e a pasta de origem foram preservados. Interface em React e motores CNC reutilizados com correções. Desde 11/10/2026, por decisão do usuário, todas as próximas alterações e entregas usam somente a distribuição leve, com o navegador instalado no Windows e servidor PowerShell local. O uso do pacote pronto não exige Node nem internet.

## Abrir no Windows

Execute `Iniciar-CNC-Leve.cmd` ou `pnpm start`. Para copiar o programa, mantenha **toda a pasta `release/CNC-Torno-Leve`** junta e abra o lançador nela. Use os mesmos usuários e senhas da versão anterior. O usuário administrador continua `admin`. A distribuição Electron anterior permanece arquivada como referência.

Os dados são salvos automaticamente na pasta própria do aplicativo no perfil Windows. Consulte o caminho pela tela **Dados e backup → Mostrar caminho dos dados**. `workspace.json` contém o estado atual; `workspace.json.previous` contém o estado anterior à última gravação. Exporte backups JSON regularmente, pois essa cópia anterior é rotativa.

## Trazer os dados anteriores

1. Na versão antiga, exporte o JSON de ferramentas e o JSON de desenhos.
2. No aplicativo novo, abra **Dados e backup**, escolha cada JSON e confira a importação antes de mesclar.
3. Para trazer também rascunho, programa, configurações e seleções, use o código de exportação completo mostrado nessa tela. Execute-o no Console da **versão antiga**, no navegador e endereço em que os dados estão salvos.
4. Importe o arquivo resultante. A mesclagem mantém os registros atuais; IDs iguais com conteúdo diferente recebem novos IDs. Antes de mesclar, o aplicativo oferece um backup do estado atual.

O aplicativo independente tem armazenamento próprio. Dados privados do navegador antigo precisam dessa exportação; não são copiados automaticamente pelo executável. Campos adicionais dos registros são mantidos, inclusive metadados do PDF. Arquivos inválidos são recusados, sem substituir o banco atual.

## Desenvolvimento local

Requer Node e pnpm. Execute `pnpm install`, `pnpm dev` e abra `http://127.0.0.1:5174`. Para atualizar a distribuição leve: `pnpm build` seguido de `pnpm package`. Para abrir a janela local: `pnpm start` ou `pnpm desktop`, ambos apontando para a versão leve. A instalação de dependências pode exigir internet; o uso do pacote pronto funciona offline.

Verificações: `pnpm test` para regressões novas; `pnpm test:legacy` para os motores e PDFs; `pnpm test:ui` para testar a distribuição leve no Edge com servidor e dados temporários.

## Correções

- Diâmetro resultante nulo ou negativo bloqueia geração.
- Número T inválido bloqueia geração, sem conversão silenciosa em 0000.
- G83 e G75 que excedem o limite de expansão são identificados como incompletos.
- Variáveis de sistema desconhecidas interrompem a interpretação. Valores conhecidos podem ser informados explicitamente na tela de simulação.
- Nova região, página, rotação ou zoom de PDF invalida confirmação anterior; resultados atrasados são descartados.
- Falhas de gravação aparecem na interface; a sessão permite exportar um backup.
- Leitor PDF, worker, fontes, mapas de caracteres e WASM são incluídos localmente.

O reconhecimento PDF continua exigindo revisão: o editor assistido projeta cilindros e cones; raios, roscas, ângulos, desenhos rasterizados e vistas ambíguas devem ser completados no editor manual. A confirmação da vista e da face Z0 é obrigatória para salvar o resultado assistido.

Consulte `TRILHA-REACT.md` para localizar código e `VALIDAR-NA-MAQUINA.md` antes de usar programas em produção. Os testes de software não substituem a conferência de comando Fanuc, fixação e ferramenta na máquina.

## Atualização da base 2.15.0

Fonte: Nosdalg123/gerador-cnc-fanuc, branch feature/dxf-editor-interativo-v2.15.0, commit 263caabb18557eedc1e399cf812241614105eda2. Versão da aplicação React: 3.1.0. Identificação e hashes em BASE-GITHUB.json.

Novo menu **Editor CAD DXF**: seleção automática assistida, delimitação de vista, perfis externos e internos, exclusão de linhas e por retângulo, extensão LINE, desfazer, restaurar e escolha de Z0. O módulo interativo da base foi integrado como módulo isolado; React mantém a navegação e os dados. A geometria original é preservada. Rascunhos CAD integram o backup completo e a persistência desktop. Nenhum rascunho é descartado automaticamente por limite de quantidade.

Perfis transferidos parcialmente ao editor manual ficam bloqueados no Gerador. Conclua os trechos e use **Confirmar revisão completa do CAD**; alterações posteriores reabrem a pendência. DWG deve ser exportado para DXF ASCII.

PDF: cotas filtradas pela extensão orientada, classificação de roscas minúsculas, bloqueio de vistas densas e prévia vetorial quando não há perfil CNC reconhecido.

Backup anterior: G:/GPT/backups/react-3.0.0-antes-base-2.15.0. Inclui fontes e app.asar da versão anterior. O perfil Windows e a chave de armazenamento React permanecem os mesmos, mantendo os dados existentes.

## Versão 3.1.1 — cotas restauradas e pacote leve

Abra `Iniciar-CNC-Leve.cmd` para usar a distribuição menor em uma janela do Edge instalado no Windows. Ela contém os mesmos recursos offline e usa a mesma pasta de dados do Electron. Feche uma versão antes de abrir a outra. O pacote leve tem cerca de 6,2 MB extraído (ZIP de 3 MB), contra 391,6 MB da distribuição Electron.

`Iniciar-CNC.cmd` também abre a versão leve. O pacote Electron em `release/3.1.1/CNC-Torno-win32-x64` fica preservado como versão anterior.

Relatório: `RELATORIO-PARIDADE-3.1.1.md`. Inclui croquis, outros erros corrigidos e testes. Para construir o pacote leve: `pnpm build` e `node scripts/package-light.cjs`.

## Versão 3.1.2 — mapa persistente para manutenção

`MAPA-CODIGO.md` explica o índice com hashes/faixas de linhas, o grafo de chamadas por AST e as consultas locais por assunto. `AGENTS.md` exige seu uso antes de cada alteração. `revisoes/mapas/` preserva cada estado diferente; a distribuição leve contém apenas o mapa da revisão entregue em `mapa/`, sem instalar analisadores no computador do usuário.

```powershell
pnpm mapa:query --query "autenticação login"
pnpm mapa:query --callers can --file src/App.jsx
pnpm mapa:query --impact src/App.jsx
pnpm mapa:query --query "desenho com cotas da espina"
pnpm mapa:check
```

Consultas, dev, build e package atualizam o mapa. `pnpm dev` observa mudanças; `pnpm mapa:watch` faz isso sem iniciar o aplicativo. `pnpm mapa` atualiza e arquiva sob demanda. A busca por assunto usa termos e rotas CNC revisados, sem LLM/embeddings. `RELATORIO-MAPA-3.1.2.md` registra os testes e limites; `ARQUITETURA-AUTENTICACAO.md` descreve os dependentes da autenticação atual.

O build grava `BUILD-REVISION.json`; o empacotamento confere que build, índice e grafo pertencem à mesma revisão. Após mudar fontes/documentação, execute novamente `pnpm build` e `pnpm package`. Os motores CNC, formatos de backup, croquis e caminho dos dados foram mantidos nesta revisão.

## Versão 3.1.3 — peças por elementos e raios em cones

Em **Desenho da peça**, a paleta original voltou: cilindros, cones, chanfros, raios, canais, roscas e os respectivos elementos internos. Clique no cartão, preencha as cotas sobre o croqui e use **Adicionar à peça**. A lista **Peça montada** permite editar, reordenar e excluir elementos; **Salvar desenho** grava a versão que será usada no Gerador. Em dois lados, as abas escolhem o lado que está sendo montado.

Para adicionar um raio, clique em **Raio** ou **Raio interno**, escolha a quina numerada no desenho e informe R. Os cones agora aceitam raios na face, nos degraus e nas uniões com cilindros/outros cones. O motor calcula a tangência no plano Z/raio e emite X como diâmetro; os cálculos CNC acompanham as cotas parametrizadas. Raios que não cabem, quinas removidas e sobreposições bloqueiam a geração. Um chanfro em cone mede C em cada aresta; em um canto perpendicular isso corresponde ao chanfro de 45°.

**Importar desenhos JSON** mescla arquivos antigos preservando os atuais e criando outro ID para conteúdos diferentes com o mesmo ID. A estrutura dos desenhos e o caminho dos dados continuam os mesmos; não há migração destrutiva. A base e as entregas anteriores ficam preservadas. Consulte `RELATORIO-ELEMENTOS-3.1.3.md` e `TRILHA-REACT.md`; o mapa inclui o assunto **Montar peças por elementos e arredondar quinas**.

## Versão 3.1.4 — reconstrução e limpeza DXF

Em **Editor CAD DXF → 2 · Reconstrução vetorial para o torno**, o eixo central participa das interseções sem virar um trecho do perfil CNC. Escolha **Quebrar linha** e clique no elemento: ele será dividido em todos os cruzamentos com linhas, arcos, círculos e eixo. Cada parte pode então ser selecionada ou apagada separadamente.

Em **Estender linha**, clique em um trecho reto, escolha a extremidade **Inicial** ou **Final** da entidade CAD e o modo **Acrescentar milímetros** ou **Até a próxima linha ou eixo**. O segundo modo encontra o primeiro elemento na direção de prolongamento; também considera arcos e círculos reais. Em **Conectar linhas**, clique na primeira linha e depois na segunda. Ambas são prolongadas até seu encontro; para trechos colineares separados, as duas extremidades encontram-se no meio da lacuna. A seleção em andamento fica roxa e pode ser cancelada. Paralelas sem encontro são recusadas sem alteração.

A importação limpa automaticamente linhas duplicadas, inclusive invertidas, e sobrepostas. Em sobreposição parcial mantém a maior **inteira**, removendo a menor inteira, conforme solicitado; mero contato ou cruzamento não é sobreposição. A regra vale também para trechos de polilinhas e arcos coincidentes; círculos repetidos são eliminados. O painel 1 e o rascunho preservam a geometria original. **Restaurar desenho original** recupera inclusive as entidades removidas na limpeza; **Desfazer edição** recupera as operações posteriores.

A seção **Cotas e elementos reconhecidos** foi retirada. As cotas nativas e notas continuam preservadas, usadas na conferência e na sugestão de comprimento. Rascunhos guardam o original uma vez e as diferenças de geometria, incluindo limpeza, quebra, extensão, conexão, seleção e exclusões. Rascunhos antigos continuam abrindo. O caminho dos dados permanece o mesmo. Detalhes e testes em `RELATORIO-DXF-3.1.4.md`.

## Meia seção CAD · 3.1.5

O editor valida somente a cadeia superior. A metade inferior fica cinza e tracejada para orientação e nunca entra no perfil CNC. Use +/−, Enquadrar desenho e Mover com mouse (também Shift + arraste, botão do meio ou Ctrl + roda). Cotas numéricas auxiliares deixam de ser sobrepostas na edição; o DXF e suas medidas originais continuam no rascunho.

Arcos circulares e faces/degraus são preservados no contorno CAD nativo. O desenho salvo pode ser reaberto em Editar contorno no CAD, com a fonte e as referências quando o rascunho correspondente estiver no backup. O comprimento medido da cadeia superior deve coincidir com o informado; o botão Usar comprimento do perfil preenche essa medida. O Gerador continua verificando ferramentas, regiões presas e configuração; a validade geométrica não libera uma preparação incompatível. Consulte RELATORIO-MEIA-SECAO-3.1.5.md para testes e limites do simulador.

## Conexões do DXF Disco 7 · 3.1.6

A lista de cadeias, a conferência e o salvamento usam continuidade de 0,001 mm. Folgas pequenas agora mostram a distância e os IDs dos elementos envolvidos, evitando mensagens secundárias de sobreposição ou de arco não traduzido quando a causa é a conexão.

Selecione o perfil completo e use **Ajustar conexões do perfil**: pontas de linhas podem ser ajustadas até 0,01 mm a outro vértice, mantendo centros, raios e pontas dos arcos. Bifurcações ambíguas, encontros entre dois arcos e folgas maiores exigem edição. O comando pode ser desfeito e invalida a confirmação anterior. Confira as cotas e a orientação novamente antes de salvar.

O caso Disco 7 original reproduz uma folga de 0,003064 mm ao quebrar a linha junto ao raio R3,5. Após o ajuste, seu contorno externo superior de 10 elementos e quatro arcos é válido, com comprimento 109,5 mm e Ø162,8 mm. Consulte RELATORIO-DISCO-3.1.6.md; a comprovação é do contorno e do salvamento, com operações internas, roscas e fixação sujeitas à preparação própria.

## Editor CAD em três etapas · 3.1.7

1. **Entrada do DXF**: arquivo, vista original, recorte, zoom da folha, eixo e face Z0.
2. **Editar desenho**: marcar o perfil, selecionar cadeias, apagar/quebrar/estender/conectar, corrigir falhas e posicionar a prévia.
3. **Salvar desenho**: prévia, nome, comprimento, conferência, rascunho ou desenho confirmado.

Voltar ou avançar mantém a geometria, a seleção e a câmera. Abrir um desenho ou rascunho com vista definida leva à etapa de edição. Rascunhos locais podem ser abertos em qualquer etapa.

As funções de marcar o perfil são botões: clique para ativar, clique novamente para desativar, ou escolha outra função. Um clique numa cadeia a marca no desenho; outro clique a desmarca. O clique funciona mesmo depois de usar ferramentas de edição ou Mover com mouse. Interno ativo atribui a cadeia ao perfil interno; nos demais modos, a atribuição é externa, salvo Desmarcar perfil.

**Ligar falhas**, ao lado de **Desfazer edição**, move pontas de linhas selecionadas a vértices únicos a uma distância estritamente menor que 0,2 mm. Não fecha as duas pontas da mesma cadeia nem escolhe encontros ambíguos. Arcos permanecem intactos. Linhas ajustadas aparecem verdes e os encontros recebem números ligados à descrição dos deslocamentos. As marcas acompanham o rascunho e a reabertura. Desfazer restaura a geometria e as marcas anteriores; toda alteração exige nova confirmação.

Zoom, Enquadrar desenho e Mover com mouse ficam no canto superior direito do desenho. A ajuda fica no **?** abaixo de Mover com mouse. Sugestões apontam cadeias faltantes, falhas próximas, bifurcações, encontros ambíguos, folgas entre arcos e retornos em Z. Continuidade para salvar permanece em 0,001 mm. Detalhes em RELATORIO-ETAPAS-CAD-3.1.7.md.

## Identificação da máquina e ferramentas · 3.1.8

A página inicial mostra TORNO CNC e apenas a versão. O botão Comando, abaixo da versão, abre a seleção Fanuc/Siemens. A escolha é salva em `form.maq.comando`, conservando cursos, fixação e demais dados. Por decisão do usuário, identifica a máquina e mantém a geração Fanuc atual; não converte programas para Siemens. O leitor continua aceitando Siemens em modo ISO.

Editar ferramenta usa três colunas com identificação, incrementos/sobremetal, rotação/avanços, observações e geometria/suporte. Em 1280×720 e 1366×768 os campos e botões cabem sem rolagem; telas menores usam disposição responsiva com rolagem para manter acesso a tudo. Roscas e canais têm orientação no cadastro para a prévia do suporte. A barra de rosca interna tem cabeça junto ao inserto e haste à direita, com vista inferior seguindo a referência fornecida. Cores e traços anteriores são mantidos; a geometria física de corte e a orientação do programa continuam intactas.

Validação: `tests/tool-layout.test.cjs` e `scripts/test-machine-tools.cjs`, incluído em `pnpm test:ui`. Imagens: `tests/maquina-popup.png` e `tests/ferramenta-rosca-interna.png`.

## Conectar retas/arcos e ligar falhas circulares · 3.1.9

Conectar linhas aceita duas retas, dois arcos ou reta/arco, inclusive segmentos de polilinhas. Calcula encontros por interseção exata de reta/círculo ou círculo/círculo e ajusta as extremidades mais próximas; pode encurtar o trecho quando o encontro cai dentro dele. Mantém centros, raios e sentido dos arcos. Na mesma circunferência, une as pontas próximas no ponto angular intermediário. Dois encontros igualmente próximos pedem revisão em vez de escolher um arbitrariamente.

Ligar falhas conserva o limite estrito de menos de 0,2 mm e a escolha de vizinhos únicos mútuos. Arco/reta ancora a reta no extremo do arco, preservando a correção já validada do Disco 7. Arco/arco ajusta ângulos quando o encontro é próximo; caso não exista encontro viável no limite, cria uma ligação reta curta explícita entre as pontas sem deformar os arcos. Não fecha uma cadeia já conectada nem atravessa outro elemento selecionado com a ligação curta. O ajuste legado `repairEndpoints` conserva comportamento/tolerância anteriores; somente `linkGaps` habilita ajustes entre arcos.

As alterações ficam verdes, com encontros numerados. O texto informa quando um trecho reto foi criado. A ligação curta entra automaticamente no perfil quando seus dois elementos pertenciam a ele. Desfazer, rascunho, salvamento, revisão CAD e reabertura conservam os ajustes e a fonte original. A auditoria do contorno superior e a confirmação das cotas continuam necessárias.

Testes: `tests/dxf-arc-connections.test.cjs` (geometria, polilinha, ambiguidades, limites, contorno circular CNC e simulação) e `scripts/test-dxf-arc-connections.cjs` (cliques reais, correções, seleção, desfazer e salvamento/reabertura em Edge com banco temporário).
