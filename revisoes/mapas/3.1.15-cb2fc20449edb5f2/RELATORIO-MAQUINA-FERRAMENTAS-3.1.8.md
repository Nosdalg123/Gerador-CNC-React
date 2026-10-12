# TORNO CNC · máquina e ferramentas · 3.1.8

A marca passa a TORNO CNC, com apenas a versão. Logo abaixo, Comando: Fanuc/Siemens abre um popup para escolher a máquina. A escolha fica em `form.maq.comando`, sem substituir cursos, fixação, ferramentas, desenhos, rascunhos ou outros parâmetros. Escape fecha o popup e devolve o foco ao botão.

Conforme a resposta expressa do usuário, a seleção identifica a máquina e mantém a geração atual. Não implementa um pós-processador Siemens. O leitor existente continua aceitando Siemens em modo ISO.

Editar ferramenta foi organizado em três colunas: identificação/incrementos, rotação/avanços/observações e geometria/suporte. Todos os campos anteriores e sua validação permanecem. A prévia oferece orientação para roscas/canais. A janela cabe sem rolagem nas resoluções verificadas de 1366×768 e 1280×720; em telas pequenas reorganiza os grupos e permite rolagem para conservar o acesso.

O suporte de rosca interna tem cabeça junto ao inserto e haste longa à direita. A vista inferior segue a posição da referência fornecida, com inserto na parte inferior da cabeça esquerda. Mantém cores, traços e legenda do projeto; o espelhamento ocorre apenas no SVG, identificado como vista inferior. A posição física da ponta, o polígono de corte do simulador e as orientações extraídas do programa permanecem iguais. O cadastro e a prévia da simulação usam o mesmo desenho.

Validação concluída:

- `pnpm test`: 68 testes aprovados, incluindo equivalência do inserto com o motor.
- `pnpm test:legacy`: regressões dos geradores, leitor, simulação, diagnósticos, PDF e DXF aprovadas.
- `pnpm test:ui`: Edge com banco temporário; seleção/reabertura, Escape/foco, programa válido idêntico após trocar a identificação, campos anteriores preservados, cadastro/orientação/reabertura, preview da simulação e layout sem rolagem aprovados. Suíte anterior de CAD e salvamento também aprovada.
- Conferência visual: `tests/maquina-popup.png` e `tests/ferramenta-rosca-interna.png`.

Fontes: `App.jsx`, `MachineSelector.jsx`, `Tools.jsx`, `ToolDrawing.jsx`, `tool-drawing.mjs`, `style.css`. Testes específicos: `tests/tool-layout.test.cjs` e `scripts/test-machine-tools.cjs`. Consulta por assunto e impacto usada antes da edição; mapa/trilha atualizados, arquivados e incluídos no pacote leve.

Backup anterior: `G:/GPT/backups/react-3.1.7-antes-maquina-ferramentas`. Distribuição leve 3.1.7 e base 2.15.0 preservadas. Nenhum teste foi feito contra o banco real do usuário.
