# Revisão 3.1.22 - simulação e ferramentas

## Resultado

- Leitura, diagnóstico, compensação, análise e avanço da remoção de material executados em Web Workers. O editor e a navegação continuam disponíveis. Uma nova entrada encerra os workers anteriores; quadros são solicitados com uma requisição por vez e destino mais recente.
- Banco de ferramentas contém identificação, geometria e condições de corte. Posição da torre e corretor são escolhidos no Gerador, por papel e por tipo de peça. T0909 de um programa externo recebe uma geometria por associação própria, sem exigir T0909 no banco. Campos T de backups antigos são preservados para compatibilidade, mas não definem a montagem.
- Raio e ponta imaginária do corretor podem ser informados por T no programa. Ponta 3 usa centro [R,R] em Z/raio; ponta 2 usa [R,-R]. A mesma referência é aplicada à geometria de corte e à trajetória. Compensação sem ferramenta/raio conhecido bloqueia a cena em vez de exibir uma simulação sem compensação como resultado válido.
- Comparação gráfica da trajetória programada (azul tracejado) e compensada (laranja).
- G73 conserva os passes e sobremetal do ciclo. P/Q deixa de ser executado como um acabamento implícito após o desbaste, tanto no leitor quanto na cena do Gerador. G70 explícito executa o acabamento. Formatos U/W/R + P/Q/U/W/F e I/K/D/P/Q/U/W/F são reconhecidos; quantidade desconhecida, zero ou superior a 3000 bloqueia a leitura do ciclo. R decimal do formato FANUC é arredondado conforme o manual 0i-F Plus; D do formato de um bloco deve ser inteiro.

## Reprodução e validação

`tests/simulation-corrections.test.cjs` confere três passes externos, sobremetal remanescente antes de G70, acabamento explícito, ciclo de um bloco, repetição inválida, ferramentas sem posição fixa e compensação com ponta do corretor. Os testes antigos do motor conferem cones, cantos, G41 interno, G42 externo e paridade Gerador/leitor.

`scripts/test-simulation-corrections.cjs` executa a interface compilada no Edge, com perfil e dados temporários. Um programa de 16000 movimentos é inserido pelo setter nativo e evento input do editor, pois o método de inserção de texto do Playwright apresentou timeout nesse volume. A resposta da aplicação é medida por temporizador e navegação. Resultado: troca de módulo em 18 ms; intervalo máximo entre atualizações do temporizador de 69,7 ms; sem erros de página. São medições deste ensaio, sem promessa de tempo constante em outros computadores. O teste também troca para um exemplo enquanto a análise anterior está em andamento, confere a nova leitura e verifica que banco e desenhos permanecem iguais.

Validação concluída: 113 testes unitários, suíte histórica dos motores e suíte completa da distribuição leve aprovados. Também foi corrigida a continuidade do servidor quando uma janela interrompe uma resposta; desconexões não encerram as outras sessões. Os ensaios de usuários e de persistência usaram exclusivamente perfis temporários.

As imagens enviadas contêm mensagens de G73/G41/G42 ignorados, enquanto os fontes e o pacote React 3.1.21 já contêm rotinas para esses comandos. A entrega usa pacote reconstruído e identificação 3.1.22 para distinguir a revisão testada.

## Referências técnicas

- FANUC Series 0i-F Plus, Operator's Manual (Lathe System), B-64694EN-1/01, seção 4.2.3: https://manualmachine.com/fanuc/0ifplus/24332568-operators-manual/
- Haas, Tool Nose Compensation / Tool Tip Direction, Programming Workbook: https://www.haascnc.com/content/dam/haascnc/en/service/reference/programming-workbooks/lathe---programming-workbook.pdf
- Haas, G73 Irregular Path Stock Removal: https://haascnc.com/service/codes-settings.type=gcode.machine=lathe.value=g73.html
- EMCO WinNC Fanuc 0-TC, ciclos de torneamento: https://www.emco-world.com/fileadmin/user_upload/_Group/pics_products/Training_Software/software_manuals/Fanuc_0/Fan0TC_EN_H.pdf
- G-Wizard, separação entre ferramentas do programa e geometria do banco: https://s3.amazonaws.com/s3.cnccookbook.com/GWETools.html

## Limite da confirmação

O usuário confirmou o comando FANUC Series 0i-MODEL F Plus. Não foi executada a simulação nativa da máquina do usuário e o programa específico não foi fornecido; o confronto com o caso exato permanece pendente. O ensaio verifica trajetórias e remoção no simulador local, usando casos reproduzíveis e referências de fabricantes. Para esse comando, a referência é o G73 de dois blocos U/W/R e P/Q/U/W/F; o formato I/K/D de um bloco também é aceito para programas de outros comandos.

Sem alterações no banco real ou nos dados existentes. Distribuição 3.1.21 e manual dessa versão permanecem preservados.
