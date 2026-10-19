# Insertos, croqui vertical e colisões — 3.1.29

## Comportamento entregue

- Banco com formato físico selecionável: C (rômbico 80°), D (55°), V (35°), T (triangular 60°), W (trígono 80°), S (quadrado), R (redondo), sangrador para canal/bedame e triangular de rosca 60°. O código comercial continua livre em Pastilha. “Atual / personalizado” preserva a geometria anterior, sem converter bancos existentes pelo nome da ferramenta.
- Formatos compatíveis com cada tipo. Ângulo nominal acompanha o formato. No redondo, IC é o diâmetro e o raio é IC/2, inclusive no gerador e na compensação; corretor incompatível é recusado. T e W têm contornos próprios, não são apenas rótulos de uma pastilha rômbica. O IC é usado para dimensionar os polígonos.
- Croqui em coluna própria, com enquadramento que considera a haste e o inserto. Montagens altas usam SVG de 300 × 360 e altura de 340 px ou 300 px conforme a tela. Campos e ações cabem em 1366×768 e 1280×720; em telas menores o diálogo permite rolagem.
- `sim.js:simulationToolParts` é a montagem física única usada no croqui configurável, na animação e na análise. A haste é verificada contra material restante e placa antes de remover material. A região sobreposta ao inserto não é contada novamente como haste. Haste nunca remove material.
- Novos alertas `haste`, `inserto` e `incremento`, com linha, coordenadas e “Ir ao ponto”. A análise mede profundidade no raio para movimentos predominantemente axiais e em Z para movimentos predominantemente radiais. Usa `incTorn` e `incFace` do cadastro associado ao T; avanço mm/rot permanece independente. Incremento ausente não gera um limite fictício.
- Contato distante da ponta é uma verificação conservadora da região ativa: alcance mínimo de 55% do IC, ampliado pelo raio e pelo incremento/ângulo da ponta. No sangrador, a largura frontal inteira pode cortar; verifica-se o corpo atrás dessa aresta usando o perfil e `incCanal`. Rosca tem região frontal própria. Isso não é uma análise de força ou um mapa de quebra-cavaco fornecido pelo fabricante.
- Primeiro ponto de cada segmento também é verificado: uma ferramenta que já começa dentro do material não apaga a evidência antes do alerta. Análise e animação compartilham esse ponto inicial.

## Referências pesquisadas

O catálogo oficial da [Mitsubishi Materials — identificação de insertos de torneamento](https://data.mmc-carbide.com/8717/0051/0631/catalog_c010a_turning_inserts_T_update.pdf) identifica S, T, C, D, V, W e R. A [Sandvik — WNMG 080412](https://www.sandvik.coromant.com/en-gb/product-details?c=WNMG+08+04+12-KM++++3225) confirma o trígono de 80°. O [guia Sandvik de ferramentas para corte e canais](https://epublications.sandvik.coromant.com/frontend/getcatalog.do?catalogId=1248960&catalogVersion=2&startpage=8) distingue sistemas de corte/canal por largura e profundidade. A seleção implementada cobre essas famílias comuns; não reproduz todas as geometrias de quebra-cavaco, furação ou fixação de cada fabricante.

## Validação e limites

Regressões em `tests/insert-formats-collisions.test.cjs` e `scripts/test-insert-formats.cjs`: catálogo, polígonos convexos, espelhos, raio redondo, haste sem contato da ponta em G0/G1, folga, furo existente, placa, excesso de incremento no raio e em Z, contato posterior, sangrador e comunicação do worker. O teste de interface verifica sete contornos diferentes, persistência e preservação dos dados anteriores em perfil isolado, croqui em duas resoluções e navegação ao alerta.

A simulação é uma meia seção 2D em XZ, malha de 0,5 mm. As contagens usam tolerâncias de sobreposição para reduzir ruído; contatos menores que essa resolução podem passar despercebidos. Comprimento e detalhes do suporte seguem a geometria representada; obstáculos e formas fora do plano não são modelados. O alerta de engajamento complementa a comparação com peça acabada e a detecção de rápido no material. Não representa garantia de ausência de colisões na máquina.

Preservados os bancos reais, desenhos, credenciais e entregas anteriores. Build e distribuição leve em pasta, sem arquivo compactado adicional. Graphify e mapa local são atualizados e conferidos no fechamento da revisão; documentos e fontes de fabricantes exigiram leitura própria, sem alegar cobertura semântica completa.
