# Editor por elementos e raios de cones — 3.1.3

Data: 11/10/2026. Distribuição: somente CNC Torno Leve. Base preservada: GitHub 2.15.0, registrada em BASE-GITHUB.json.

## Problemas confirmados no fonte

O editor manual React usava um seletor de tipo e linhas de campos; os cartões, croquis individuais e seleção de quina sobre o desenho da interface original não tinham sido integrados. Os ativos recuperados vieram de `G:/GPT/base-github-v2.15.0/Gerador/desenho.js`, sem alterar a base.

O motor original oferecia quinas de cilindros e recusava marcações de chanfro/raio quando o trecho alvo era um cone. Portanto, a limitação de cones também existia na base; não era apenas um controle escondido na interface React.

## Comportamento restaurado

- 13 cartões de elementos externos/internos, ícones e croquis com cotas editáveis.
- Croquis de cones externos/internos acompanham a relação entre os diâmetros digitados, com as cotas no lado correto; canais sequenciais indicam trecho anterior/próximo em vez de uma face Z0 artificial.
- Montagem sequencial, edição, reordenação e exclusão; operações canceladas mantêm a peça anterior.
- Escolha da quina sobre o SVG, por teclado ou pela lista numerada; marcação ancorada no ID do trecho.
- Raios e chanfros na entrada/fim de cones, nos degraus e nas uniões contínuas que realmente formam uma quina. Linhas colineares não oferecem canto artificial.
- Prévia do lado em edição independente de um segundo lado ainda vazio. Medidas inválidas exibem erro; quando disponível, a última prévia válida é identificada explicitamente.
- Importação JSON de desenhos antigos com backup anterior, mesclagem e novos IDs para colisões, mantendo os atuais.

## Geometria e programa

O arredondamento é calculado no plano físico Z/raio. Para duas arestas com direções unitárias u e v, o recuo tangente é `R × sqrt((1 − u·v)/(1 + u·v))`. As coordenadas X do CNC continuam sendo diâmetros. G2/G3 seguem o sentido do contorno; a prévia usa o mesmo arco.

O programa emite cálculos parametrizados de tangência: variáveis 600+ no externo e 800+ no interno. Alterar uma cota do cone no programa recalcula as tangentes. Um chanfro mede C em cada aresta; somente arestas perpendiculares resultam em 45°. O gerador valida a geometria das cotas atuais, incluindo o espaço ocupado por cantos nas arestas e por canais internos.

Mantidos os limites e validações da base: 12 elementos externos e 8 internos por lado, restrições de subcorte, fixação, ferramentas, furo piloto e revisão obrigatória de CAD incompleto. Alterações feitas diretamente no TXT devem ser conferidas novamente; o programa não inclui uma nova validação automática de cotas no comando da máquina.

## Preservação

Não mudou o formato do workspace/desenho. IDs, campos adicionais, ferramentas e metadados continuam preservados. Os dados reais do usuário não foram usados nos testes nem regravados. O caminho continua `%APPDATA%/CNC Torno React/workspace.json`, com `.previous` e proteção contra alteração externa.

Fonte anterior: `G:/GPT/backups/react-3.1.2-antes-editor-elementos`. ZIP/pasta leve 3.1.2, versões anteriores e base GitHub preservados. O mapa foi consultado antes das alterações, recebeu o conceito de montagem por elementos e acompanha a entrega na mesma revisão do build.

## Verificação

- `pnpm test`: 37 testes, incluindo 11 regressões novas de tangência, quinas, macros, G71/G72/G73, canais, croquis e preservação. Os testes de tangência exercitam 54 combinações de inclinação, sentido e raio.
- `pnpm test:legacy`: suíte original de geração, simulação, diagnóstico, PDF e DXF aprovada; inclui 232 verificações de interpretação/simulação e 313 de diagnóstico, sem falhas.
- `pnpm test:ui`: versão leve no Edge com perfil temporário. Sete geradores, croquis de cotas anteriores, PDF/CAD, nova montagem, raio externo/interno de cone, edição, cancelamento, reordenação, exclusão, dois lados, geração, mesclagem com ID repetido e reabertura aprovados.
- Persistência: texto Unicode, backup anterior, recusa de dados inválidos e proteção contra outra sessão aprovados. Nenhum erro JavaScript no fluxo verificado.
- Evidências: `tests/piece-editor-result.json`, `tests/light-result.json`, `tests/editor-elementos.png`, `tests/croqui-cone.png` e `tests/raio-cone.png`.

Os testes confirmam o comportamento de software descrito; a conferência de comando, ferramenta e fixação permanece documentada em `VALIDAR-NA-MAQUINA.md`.
