# Editor CAD DXF: etapas, cadeias e correções · 3.1.7

Revisão de 12/10/2026, baseada nas três imagens do usuário. Distribuição leve, sem mudar a base 2.15.0, as entregas anteriores ou o banco real.

## Seleção das cadeias

Na 3.1.6, `drawChains` recusava a atribuição se o modo fosse apagar, quebrar, estender ou conectar. A cadeia aparecia no painel, mas o clique não marcava o desenho nesses modos. Agora um clique marca, outro desmarca; a ação muda para Externo, ou mantém Interno quando este está ativo. Desmarcar perfil continua desmarcando. Atribuição não depende de um modo de edição anterior e desativa Mover com mouse para permitir continuar a seleção.

O botão da cadeia indica seleção por cor e `aria-pressed`. A geometria correspondente fica destacada. O objeto HTML do painel React também passou a ser estável para manter os controles e seus handlers nas atualizações do banco.

## Fluxo e comandos

- Etapa 1: selecionar DXF, localizar/delimitar outra vista, folha original, zoom da folha, eixo central e Z0.
- Etapa 2: ferramentas de perfil, seleção das cadeias, apagar/quebrar/estender/conectar, Ligar falhas, desfazer, restaurar e posicionar o desenho.
- Etapa 3: prévia, nome, comprimento, conferência, rascunho, revisão manual e Salvar desenho.

As abas superiores e os botões de voltar/continuar permitem rever etapas. Voltar não reimporta o arquivo e não apaga alterações, seleção ou câmera. Uma vista/eixo são necessários para entrar na edição; salvar rascunho continua disponível com dados ainda incompletos. Abrir um desenho ou rascunho com vista definida entra na edição. Rascunhos locais ficam num painel comum às etapas.

As oito funções Marcar no perfil viraram botões. A função ativa muda de cor; outro clique a desativa, e escolher outra desativa a anterior. Com nenhuma função ativa, o clique numa linha apenas inspeciona suas medidas. Desfazer edição e Ligar falhas ficam junto dessas funções.

Zoom −/+, Enquadrar desenho e Mover com mouse ficam sobre o canto superior direito. O ? abaixo de Mover mostra/esconde a mensagem solicitada. A mensagem foi removida do bloco acima do desenho. O texto Z0 fica no canto superior esquerdo para não ficar encoberto pelos controles da câmera.

## Ligar falhas e indicação do resultado

`endpointConnections` detecta vizinhos por busca espacial. `linkGaps` ajusta pontas de linhas selecionadas a outro vértice com distância estritamente menor que 0,2 mm, levando em conta arredondamento numérico no limite. Exige vizinho único mútuo e não fecha as duas extremidades já pertencentes à mesma cadeia. A opção interna `repairEndpoints` mantém 0,01 mm como padrão para consumidores anteriores.

Os centros, raios e extremidades dos arcos são preservados. Uma linha se ancora ao vértice do arco quando há arco no encontro; entre duas linhas, uma ponta existente serve de âncora. Dois arcos e encontros ambíguos ficam para revisão. A ferramenta só é habilitada quando existe ajuste aplicável no perfil selecionado.

Linhas ajustadas ficam verdes; cada encontro recebe um círculo e um número. A descrição lista número, ID, extremidade, distância e âncora. As marcas são guardadas no rascunho e reaparecem na reabertura. Desfazer restaura a geometria, seleção e marcas anteriores. Outra edição geométrica substitui o destaque da última correção automática. A fonte original continua separada da cópia com delta.

Sugestões orientam selecionar todas as cadeias do contorno, usar Ligar falhas em encontros próximos, estender/conectar folgas maiores, retirar auxiliares em bifurcações, revisar encontros ambíguos/dois arcos e conferir Z0/retornos axiais. O ajuste não confirma o desenho automaticamente: a caixa de conferência é desmarcada. A validação de continuidade permanece em 0,001 mm, e as demais verificações do Gerador permanecem ativas.

## Verificação

- 67 testes Node, incluindo falhas 0,002, 0,019, 0,199 e 0,199999 mm, rejeição de 0,2 mm ou mais, preservação de arcos/delta, casos ambíguos, cadeia aberta legítima e indicação SVG.
- Regressão legada: leitor/simulador, diagnósticos, PDF e DXF.
- Teste da distribuição leve em Edge com perfil e banco temporários: as etapas, cadeia selecionada enquanto Apagar/Mover estão ativos, alternância dos botões, destaque, zoom/câmera/ajuda, retorno sem perda, ligar 0,199 mm, rejeitar 0,2 mm, ambiguidade, desfazer, salvar/reabrir com marcas e dados anteriores intactos.
- Os testes anteriores continuam cobrindo sete geradores, desenhos cotados, PDF, editor por elementos/raios em cones, CAD, operações DXF, meia seção, persistência e o DXF original Disco 7 com quatro arcos.

Evidências: `tests/cad-etapas-result.json`, `tests/cad-etapas-2.png`, `tests/cad-etapas-3.png`; teste `scripts/test-cad-stages.cjs`, chamado pelo teste leve. `scripts/cad-test-flow.cjs` navega pelos botões das etapas para manter os testes anteriores usando controles visíveis.

Backup anterior em `G:/GPT/backups/react-3.1.6-antes-etapas-cad`. A versão 3.1.6 e seus exemplos permanecem disponíveis. O mapa foi consultado antes da edição; conceito, trilha, grafo e índice atualizados, conferidos e incluídos na distribuição da mesma revisão.
