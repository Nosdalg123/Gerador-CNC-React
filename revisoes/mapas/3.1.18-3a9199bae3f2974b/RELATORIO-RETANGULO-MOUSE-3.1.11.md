# Retângulo de exclusão acompanha o mouse · versão leve 3.1.11

Apagar por retângulo convertia o mouse pela proporção entre viewBox e caixa HTML do SVG. Quando a altura máxima do quadro criava margens para manter a proporção do desenho, o retângulo ficava deslocado. Em uma cópia isolada do código anterior, o teste reproduziu um deslocamento horizontal de aproximadamente 142 pixels.

`dxfimport.js:viewPoint` agora transforma a posição de tela pela matriz inversa de `getScreenCTM()`. A conversão considera margens do SVG, escala CSS, rolagem, zoom e translação da câmera. É compartilhada pela exclusão por retângulo, delimitação da vista e ponto de ancoragem do zoom com Ctrl + roda.

Mover com mouse guarda a matriz inversa no início do arraste e aplica o deslocamento de tela nessa base fixa. Assim o desenho também acompanha o cursor em quadros com margens, sem acumular mudanças de escala durante o gesto. A transformação permanece visual: não modifica coordenadas CAD, medidas, arcos, programas ou banco de ferramentas.

Validação:

- 80 testes unitários aprovados.
- Teste real no Edge em 2000×1200 e 1100×1000, Z0 à esquerda e à direita, zoom e movimento, arraste nos dois sentidos. Bordas do retângulo alinhadas ao cursor com tolerância de 1,5 pixel, exclusão apenas da linha marcada e Desfazer restaurando a seleção.
- Delimitação da vista original acompanhando o mouse, geometria original e dados existentes preservados.
- Evidência: `tests/cad-pointer-result.json`, `tests/retangulo-mouse.png`; comparação anterior em `tests/pointer-before-3111.log`.
- Teste integrado a `pnpm test:ui`, com servidor e banco temporários.
- `pnpm test:ui` aprovado integralmente: sete geradores, DXF, arcos, Disco 7 original, editor por elementos, ferramentas, backup e proteção dos dados. Sem erros de página nos casos do mouse.

Fontes: `public/engine/dxfimport.js`, `scripts/test-cad-pointer.cjs`, `scripts/test-light.cjs`. Trilha e mapa atualizados, com cópia do mapa no pacote. Backup: `G:/GPT/backups/react-3.1.10-antes-retangulo-mouse`. A distribuição 3.1.10, os mapas históricos, o DXF original e os dados reais foram preservados.
