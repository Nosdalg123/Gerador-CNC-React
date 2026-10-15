# Revisão 3.1.25 — canal com raio, bedame e colchetes FANUC

## Ferramentas

Ferramentas → Nova/Editar → Canal / encaixe ou Bedame · corte.
O perfil da aresta pode ser Reto, Raio nas quinas ou Raio total.
Raio nas quinas arredonda os dois cantos da aresta; Raio total usa R = largura / 2
e acompanha imediatamente as alterações de largura. O comprimento atrás da aresta
é independente. Raio maior que metade da largura ou que o comprimento é recusado.

O bedame fica disponível nos seletores de canal do Gerador e na associação de
qualquer T da Simulação. Há orientação frontal, externa/radial e interna, com as
quatro montagens físicas inferior/superior, esquerda/direita. Torre e corretor
continuam definidos por programação (1 a 99), sem fixar T no cadastro da ferramenta.
O croqui e a remoção física usam o mesmo polígono arredondado e convexo.

Ferramentas antigas sem perfil continuam retas. O raio do perfil é independente do
raio do corretor de torneamento. A referência permanece no canto teórico da aresta;
o perfil de corte não acrescenta compensação G41/G42 nem modifica automaticamente
o percurso para produzir outro contorno. A haste continua esquemática, sem detecção
de colisão física do suporte. Nenhum banco real foi usado nos ensaios.

## Colchetes e cálculos

O manual local B-64694EN-1/01 trata do sistema de torno e não contém o capítulo
comum de macros. A referência complementar FANUC B-64607EN/01, lista de alarmes,
página impressa 355 (PDF 380), informa no alarme 0118 o limite de cinco níveis de
colchetes, incluindo os usados em funções.

Fonte: https://www.drivesul.com.br/template/imagens/manuais/manuais-fanuc/fanuc-series-0i-model-f/FANUC%20Series%200i%20MODEL%20F%20-%20OPERATION%20AND%20MAINTENANCE%20HANDBOOK.pdf

`psContornoComCones` calcula os quatro deltas de cada canto em #500 a #503 antes
das normas, produto escalar e pontos de tangência. Essa faixa estava livre no
gerador e é recalculada antes de cada canto externo ou interno; as coordenadas
finais continuam nas respectivas faixas #600 e #800. As cotas continuam editáveis
no CNC. Não foram trocados colchetes matemáticos por parênteses de comentário.

Os casos de regressão com vários cones, raios/chanfros e contornos externos e
internos usam no máximo dois níveis. Todos os geradores passam pelo verificador
de balanceamento e limite de cinco níveis antes de devolver o código. O leitor
confere também blocos não executados; programa incompatível é bloqueado antes de
produzir movimentos. Isso valida a sintaxe e os casos testados no software, sem
substituir a conferência e o ensaio no comando real da máquina.

## Validação e ambiente

- 127 testes unitários aprovados, incluindo geometria arredondada nas três
  orientações/quatro montagens, material preservado nas quinas, bedame, T9912,
  expressões no limite/excedentes e cantos múltiplos paramétricos.
- Suíte histórica dos motores aprovada.
- Edge com dados temporários: raio parcial/total, mudança de largura, medidas
  inválidas sem interromper a interface, montagens/orientações, salvar/reabrir,
  seleção no Gerador e transferência do raio ao worker de simulação aprovados.
- Teste existente de geometria/suporte e execução em 400× aprovado.
- `watchMap` possui verificação periódica de metadados, pois a unidade virtual
  Google Drive aceita `fs.watch` mas não emite eventos. Arquivos gerados ficam
  excluídos e alterações não provocam ciclo de atualização.
- Dependências em modo hoisted, compatível com a unidade virtual.
- Graphify oficial 0.9.90 instalado isoladamente em `.tools/graphify-python`,
  fora da fonte ativa. `Atualizar-Graphify.ps1` usa essa instalação quando presente,
  evitando o comando homônimo `graphify-cli` do PATH.

Backup em pasta: `../backups/react-3.1.24-antes-canal-bedame-macros-20261015`.
Os 125 arquivos originais indexados foram conferidos por SHA-256.
Somente distribuição leve; nenhum compactado criado.
