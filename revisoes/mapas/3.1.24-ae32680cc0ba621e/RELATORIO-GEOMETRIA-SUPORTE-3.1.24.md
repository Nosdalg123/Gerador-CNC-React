# Revisão 3.1.24 — geometria, suporte e 400×

## Uso

No simulador, o seletor de velocidade inclui 400×. O cálculo de material continua em worker e recebe o destino mais recente da animação.

Em Ferramentas → Editar/Nova → Geometria e suporte, os campos acompanham o tipo da ferramenta. Torneamento/mandrilamento: raio, ângulo da pastilha, largura do inserto, espessura da haste e κ. Canal: largura de corte/canal, comprimento do inserto atrás da aresta, espessura da haste e κ. Rosca: ângulo, largura da base do inserto, espessura da haste e κ. Broca: Ø da broca e espessura/Ø da haste. Medidas vazias usam os padrões anteriores.

O usuário confirmou que a posição pedida é a montagem física no suporte. Há quatro opções: inferior esquerdo/direito e superior esquerdo/direito, além do padrão do tipo. O desenho usa +Z à direita e +X para cima. A montagem não atribui posição de torre ou número de corretor ao banco.

A largura da pastilha rômbica corresponde ao círculo inscrito (IC); o comprimento da aresta é calculado pelo ângulo. Na ferramenta de canal, largura de corte e comprimento do inserto são independentes. A espessura/Ø da haste altera a montagem desenhada. κ altera a orientação da pastilha e a cabeça do suporte; nos formatos de canal/rosca, também orienta o corpo do suporte.

## Implementação e preservação

As medidas são transportadas por `core.js:simTool` para o croqui, a cena do programa e a animação. Espelhos mantêm a ordem anti-horária do polígono, necessária para a remoção de material. O centro do raio segue a ponta do corretor: quando não há ajuste explícito no trabalho, a sugestão acompanha a montagem física; uma ponta já definida no trabalho permanece prevalecendo.

Dimensões antigas, campos extras e T de compatibilidade são preservados. O banco real não foi alterado durante os ensaios. A haste usa espessura configurada, mas a cabeça e comprimento são representações esquemáticas; remoção e alertas continuam considerando somente a parte de corte.

## Validação

`tool-geometry.test.cjs` confere quatro montagens, espessura física da haste, inserto assentado na cabeça, referência do corretor, largura de canal independente, largura IC, efeito de κ e validação por tipo.

`test-tool-geometry.cjs` verifica alteração imediata do croqui, todas as opções de montagem, salvar/reabrir, transferência das medidas ao simulador, ponta sugerida e execução em 400× com dados temporários. O banco e os desenhos existentes do perfil de teste são comparados antes/depois.

Resultado: 121 testes unitários, suíte histórica dos motores, suíte completa da distribuição leve e teste específico dos novos campos/400× aprovados. O editor foi conferido em tela de 1366×768 e permanece disponível sem rolagem nessa resolução.

## Referências de produto

- Vericut, parâmetros e orientação da montagem: https://help.vericut.com/4_vericut_help/5.04_tool_manager_window_tool_parameter
- Vericut, medidas de inserto e suporte: https://help.vericut.com/4_vericut_help/5.05_tool_component_tab.html
- Sandvik Coromant, IC da pastilha: https://www.sandvik.coromant.com/en-gb/product-details?c=CNGA090304S01030A+++7025&m=5724647
