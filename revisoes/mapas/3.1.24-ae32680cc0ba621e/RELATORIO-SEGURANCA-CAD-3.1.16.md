# Comprimentos independentes e proteção do percurso CAD — 3.1.16

Os dois comprimentos no Gerador são independentes. Não precisam somar o comprimento da peça e editar um deles não altera o outro. Uma faixa central sem usinagem apenas gera aviso e fica no bruto. Limites inválidos e invasão da região presa nas castanhas continuam impedindo o código.

O acabamento CAD anterior seguia também as descidas radiais atrás de ombros, embora o desbaste longitudinal atual parasse no primeiro obstáculo. Isso permitia entrar em frestas e rampas ainda brutas. A geração agora analisa retas e os extremos internos dos arcos: se encontrar esse retorno radial, bloqueia o programa externo com a posição Z e uma dica para reduzir o comprimento ou usar a outra face. Não basta trocar o ciclo para contornar a proteção. É uma restrição conservadora da estratégia externa atual; operações de rebaixo/fresta com outra ferramenta exigem preparação própria. O desenho completo e o DXF original continuam preservados.

O recorte do comprimento para antes de iniciar uma face radial no próprio limite. A saída N2G0X#1 permanece no programa como retorno, mas não compõe os pontos geométricos da peça. O encontro dos lados usa o perfil da operação anterior; uma área não usinada é representada por degraus de bruto, sem a fresta artificial ou rampa que o retorno rápido criava.

O exemplo Disco 7 reproduziu o bloqueio no lado da face curva ao entrar no cone depois de Z-4,5 mm. Um teste com 4,5 mm desse lado e 95 mm da outra face, Ø bruto 200 mm, bruto 111,5 mm e fixação 12 mm gerou ambos os programas sem alertas no simulador. São parâmetros do teste, não substituem a configuração da fixação real. A região central restante é informada como não programada. O teste verifica também a recusa quando o lado 2 ultrapassa o trecho livre.

Cobertura: 100 testes unitários, motores legados e suíte da versão leve, incluindo testes de frestas, extremos internos de arcos, encontro dos lados, independência dos comprimentos, bloqueio do download de código inválido e simulação do Disco 7. A simulação continua limitada ao corte XZ e ao inserto modelado; haste e porta-ferramenta não são modelados.

Referência sobre a necessidade de desbaste antes do ciclo de acabamento: [Haas — G70](https://www.haascnc.com/service/codes-settings.type%3Dgcode.machine%3Dlathe.value%3DG70.html). A restrição desta revisão vem da implementação local e não afirma que todos os comandos Fanuc/Siemens têm as mesmas capacidades.
