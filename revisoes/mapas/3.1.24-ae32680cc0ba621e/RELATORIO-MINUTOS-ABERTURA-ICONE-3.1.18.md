# Minutos, abertura e ícone — 3.1.18

O simulador exibe Corte, Rápido e progresso em minutos, com até duas casas decimais. O cálculo interno, o controle de reprodução e os percursos continuam em segundos; apenas a apresentação divide os valores por 60.

Abra `Iniciar-CNC-Leve.vbs` ou `TORNO CNC.lnk` para iniciar a versão leve sem janela de console. O lançador usa Windows Script Host e solicita PowerShell oculto, preservando o servidor local, a porta automática e os dados anteriores. O CMD permanece como compatibilidade; ao clicar em um CMD, o próprio Windows pode mostrar sua janela brevemente. `pnpm start` e `pnpm desktop` usam o lançador sem console.

O VBS cria ou atualiza o atalho TORNO CNC na pasta do programa, com o ícone de torno. Após extrair ou mover a pasta, execute o VBS uma vez para atualizar o destino do atalho. O pacote local entregue já contém o atalho com o caminho correto.

Ícone vetorial Lathe Machine do SVG Repo, declarado CC0: https://www.svgrepo.com/svg/234349/lathe-machine . O SVG foi obtido pela cópia pública em https://www.svgviewer.dev/s/128691/lathe-machine porque o download direto estava indisponível. Foram exportados PNG 1024 e ICO com resoluções 16, 24, 32, 48, 64, 128 e 256. O SVG é o favicon; o ICO é usado pelo atalho. A marca Alumasa existente foi preservada.

Validação: testes de interface comparam os tempos exibidos com os segundos calculados pelo motor divididos por 60. A abertura oculta é testada com banco temporário e sem navegador, verificando servidor acessível, processo sem janela e atalho. O mapa local inclui o novo VBS no inventário; não há extração de chamadas VBScript.
