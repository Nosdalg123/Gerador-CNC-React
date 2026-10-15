# Revisão 3.1.26 — inserto no suporte, externo vertical e T padrão

## Uso

Em Ferramentas → Nova/Editar:

- **Posição do inserto no suporte:** Centro, Esquerda ou Direita. A opção Padrão do
  suporte conserva a montagem anterior das ferramentas que já existiam.
- **Orientação do suporte:** nas ferramentas Torneamento externo e Faceamento,
  escolha Horizontal ou Vertical. O pedido foi confirmado pelo usuário para o
  desbaste externo, tanto no croqui quanto na animação.
- **Número padrão no programa · T:** campo opcional de quatro dígitos, por exemplo
  `0404` (posição 04, corretor 04). Zeros iniciais são preservados. As duas partes
  devem estar entre 01 e 99.

O assento define onde o inserto fica em relação à largura da haste. No suporte
vertical, esquerda e direita seguem a tela, inclusive após as quatro opções de
espelhamento da montagem. O croqui e a animação usam a mesma geometria do suporte.
O ponto de referência de corte, o polígono do inserto e a espessura da haste são
preservados: a posição da haste é ajustada ao assento selecionado. O suporte
continua ilustrativo para remoção de material e alertas de colisão.

## Código padrão e compatibilidade

O Gerador usa o novo `tPadrao` como sugestão de posição/corretor se o trabalho ainda
não tem montagem salva. Uma montagem já definida no trabalho prevalece e não
reescreve o padrão do cadastro. Um padrão vazio mantém a regra anterior.

A Simulação reconhece um código padrão inequívoco ao ler um T do programa. A
associação manual tem prioridade, inclusive uma escolha explicitamente vazia.
Códigos iguais exigem um único candidato do tipo sugerido, ou associação manual
quando ainda há ambiguidade. O T histórico dos cadastros antigos permanece
preservado, sem ser transformado automaticamente em novo padrão.

Ferramentas existentes sem as novas opções conservam a montagem anterior. As
opções de raio parcial/total de canal e bedame da versão 3.1.25 permanecem.

## Implementação e validação

- `tool-drawing.mjs:configuredParts` alinha a haste ao assento, incluindo a opção
  vertical do externo; `Simulation.jsx` já consome a mesma montagem.
- `sim.js` separa opções visuais do suporte da configuração do polígono de corte,
  preservando inclusive a geometria das ferramentas antigas com κ configurado.
- `core.js:simTool` transporta assento/orientação para a cena. A orientação vertical
  é própria do externo/faceamento; não é aplicada ao desbaste interno.
- `toolsetup.js:standardCode`, `slotSetup` e `programTool` aplicam o T padrão sem
  substituir montagens e associações explícitas do trabalho.
- 133 testes unitários aprovados. Os novos testes conferem três assentos nas
  quatro montagens, largura/verticalidade da haste, inserto e referência invariantes,
  T0404, prioridade de T0912 salvo no trabalho, ambiguidade e transporte ao worker.
- Teste Edge com dados temporários: cadastro, validação de T0400 inválido,
  salvar/reabrir, três assentos, externo vertical, T0404 no Gerador, ajuste T0912,
  associação automática na Simulação e animação executada/pausada aprovados.
  Cadastro conferido em 1366×768 e 1280×720, com todos os controles acessíveis;
  espaçamento compacto em telas baixas.

Backup das fontes e índices: `../backups/react-3.1.25-antes-assento-suporte-tpadrao-20261015`.
Os 127 arquivos do manifesto Graphify da versão anterior foram conferidos por hash.
Dados reais e entregas anteriores preservados; somente distribuição leve em pasta,
sem gerar compactados.
