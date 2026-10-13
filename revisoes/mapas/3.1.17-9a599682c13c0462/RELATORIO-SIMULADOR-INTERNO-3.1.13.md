# Enquadramento da usinagem interna · versão leve 3.1.13

A janela do simulador usava `scene.foco`, calculado pelo gerador a partir da profundidade externa. Um perfil externo de 20 mm e interno de 75 mm produzia uma janela começando em Z−28: o corte em Z−75 era desenhado à esquerda do canvas. O enquadramento também ancorava o zoom no canto, afastando o centro da peça.

`src/simulation-view.mjs:simulationViewport` agora une os limites do bruto completo, perfil de bruto, contorno, cavidades, internos, vazios existentes e foco válido. Reserva espaço junto ao eixo para o inserto interno. Movimentos de retorno à posição de troca e o tamanho da placa não determinam a escala. A vista permanece fixa ao longo da operação, com margens e escala uniforme. Zoom centralizado; Ajustar volta à peça inteira. Zoom ampliado pode recortar detalhes intencionalmente, como antes.

`Simulation.jsx:draw` usa a nova transformação compartilhada pelo Gerador e pela Simulação de programa. Não altera trajetórias, medidas, G-code, ferramentas, tempo, compensação, remoção de material ou verificação de colisões. Nenhum formato do banco foi modificado.

Validação:

- 91 testes unitários aprovados. Três casos novos reproduzem matematicamente o recorte anterior, conferem toda a peça e cavidade profunda, estabilidade durante furação/mandrilamento, dados da cena intactos, retorno de ferramenta, zoom centrado e foco inválido.
- Teste real no Edge em perfil temporário: externo de 20 mm e interno de 75 mm, avanço até o corte profundo, transformação efetiva do canvas, bruto inteiro visível, enquadramento idêntico antes/durante o corte, zoom/Ajustar, tela de 1100 px, desenhos e ferramentas anteriores preservados.
- `pnpm test:ui` completo aprovado: sete geradores, simulador, PDF/DXF, conexões de arcos, mouse, Disco 7, CAD em dois lados, editor por elementos, ferramentas e persistência/proteção dos dados em perfil temporário.
- Evidências: `tests/simulation-view-result.json`, `tests/simulador-interno-enquadrado.png` e `tests/unit-3113.log`.

Backup anterior: `G:/GPT/backups/react-3.1.12-antes-enquadramento-interno`. Distribuição 3.1.12 e dados reais preservados. Trilha, vocabulário e mapa atualizado acompanham a entrega leve.
