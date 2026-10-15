# Revisão 3.1.23 — animação das ferramentas

## Problema reproduzido

O programa enviado pelo usuário foi lido integralmente, sem erro de interpretação, com 1509 movimentos. Foram conferidos os trechos externo, furação, mandrilamento e rosca interna em cópia temporária dos dados. O T0606 não tinha associação explícita e havia duas geometrias internas no banco; a seleção automática permanecia vazia, mas a cena usava um rombo externo padrão. Isso desenhava e removia material do lado incorreto do ponto programado. O programa e o banco reais foram preservados.

O croqui e a animação também usavam construções diferentes do inserto: comprimento 9 versus 12 mm, referências distintas para o raio e uma vista espelhada do croqui de rosca interna. No cadastro essa vista é ilustrativa; no programa deve corresponder aos eixos da simulação.

## Correção

- Ferramentas de corte sem geometria associada impedem a simulação e exibem o T pendente. A associação de geometrias permanece independente da posição e do corretor do banco. Nenhuma das duas ferramentas internas é escolhida por sua posição antiga.
- `simulationToolParts` usa exatamente o polígono de `CNCSim.toolShape`, incluindo o deslocamento da ponta do corretor. O croqui do programa e a animação compartilham orientação e origem X/2, Z. As vistas ilustrativas do cadastro permanecem disponíveis.
- A animação mostra a parte de corte em laranja, o suporte ilustrativo em cinza e a referência programada com uma cruz. O centro do raio aparece em branco. O T ativo e o aviso de ferramenta fora da área visível ajudam a acompanhar retornos ao ponto de troca sem alterar o enquadramento da peça.
- Remoção e alertas continuam considerando apenas a parte de corte. O suporte é uma ilustração, sem validação de colisão da haste ou dimensões reais da montagem.
- A abertura de uma revisão mais nova reinicia o servidor CNC da revisão anterior, identificado pelo token local, perfil e processo PowerShell. Assim o lançador novo não reutiliza silenciosamente a interface antiga. A mesma versão continua reutilizando a sessão; o banco, desenhos e cadastro mantêm os caminhos existentes. O reinício não foi executado contra a sessão real aberta durante o desenvolvimento.

## Validação

Testes unitários conferem o mesmo polígono nos sete formatos de ferramenta, o posicionamento interno/externo em coordenadas físicas, a associação ambígua e o bloqueio/liberação pelo worker. O teste de interface usa caso sintético de quatro ferramentas, compara os pontos desenhados no canvas com a transformação do polígono físico, executa a animação e confere a preservação do banco e dos desenhos.

117 testes unitários, suíte histórica dos motores, suíte completa da distribuição leve e ensaio de responsividade com 16000 movimentos aprovados. O teste específico de reinício usa perfis temporários e verifica atualização entre versões, reabertura da mesma versão e preservação do banco e cadastro.

O programa real foi conferido localmente, com a geometria de desbaste interno selecionada em perfil temporário. O código CNC privado não faz parte do repositório público nem da distribuição. Este ensaio confirma o comportamento do simulador 2D; não foi realizado ensaio no comando da máquina. O percurso de rosca não representa uma malha helicoidal tridimensional.

## Referência de produto

Vericut, Tool Component tab: inserto e suporte usam componentes e cores distintos, coerentes entre gerenciador e vistas da simulação: https://help.vericut.com/tool_manager_standalone/5.05_tool_component_tab

As correções de responsividade, montagem por programação, compensação e G73 da revisão anterior permanecem descritas em `RELATORIO-SIMULACAO-FERRAMENTAS-3.1.22.md`.
