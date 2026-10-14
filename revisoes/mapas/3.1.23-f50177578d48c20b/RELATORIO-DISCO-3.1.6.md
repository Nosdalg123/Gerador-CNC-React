# Disco 7: conexão tangente, salvamento e exemplo · 3.1.6

Em 12/10/2026, análise do arquivo original `G:/GPT/_modelos exemplo/Disco 7'' - Empurrador P2 - 7'' -26-4-24.DXF` e da imagem enviada. A reprodução refaz uma seleção equivalente do perfil externo; o estado exato das 17 edições da imagem não estava disponível.

## Causa reproduzida

O DXF tem 116 entidades geométricas, 15 cotas nativas e unidade mm. Na cópia de trabalho, a importação remove 11 entidades sobrepostas, mantendo as maiores. O original permanece intacto.

A linha F3 tem X=149,5407743461, enquanto o vértice tangente do arco EB, R3,5, tem X=149,5407756872. Essa diferença de cerca de 0,0000013411 mm em X faz a interseção analítica da quebra ocorrer cerca de 0,003064 mm afastada do vértice do arco em Y. A lista da versão 3.1.5 considerava conexões até 0,16 mm; o contorno nativo exigia 0,001 mm. Assim, a lista anunciava uma cadeia enquanto o salvamento encontrava quatro pontas em dois grupos.

Quando o contorno nativo falhava, a auditoria antiga voltava a medir somente intervalos de retas. Surgiam mensagens de sobreposição/lacuna axial e raios não traduzidos, apesar de os arcos terem representação nativa. Essas mensagens eram consequência do caminho de auditoria inadequado, e não explicação confiável do defeito principal.

## Correção

- Lista, conectividade e salvamento usam 0,001 mm. A tolerância de validação não foi aumentada.
- Diagnóstico identifica a folga medida e os IDs dos elementos envolvidos.
- **Ajustar conexões do perfil** ajusta apenas pontas de linhas selecionadas a um vértice próximo, até 0,01 mm, com vizinho único mútuo. Linhas se ancoram às extremidades dos arcos; centros, raios e pontas dos arcos permanecem iguais. Encontros ambíguos e dois arcos não são movidos.
- Ajuste exige nova confirmação das cotas e pode ser desfeito. Fonte completa e delta de alterações continuam no rascunho.
- Auditoria de contorno nativo inválido relata a falha nativa, sem a sequência enganosa de erros da auditoria de intervalos retos.

No exemplo, quatro pontas são ajustadas. Maior deslocamento: 0,003063935408 mm. Os outros três deslocamentos são aproximadamente 0,000001 a 0,0000025 mm. Nenhum raio foi recalculado.

## Solução geométrica

O contorno externo superior contém F1 superior, ED, EA, F2 superior, E5, E7, F3 superior, EB, EF e F4. As linhas auxiliares e os retornos não integram a seleção. Partes inferiores visíveis são referências tracejadas.

| Conferência | Resultado |
| --- | --- |
| Cadeias / bifurcações / pontas | 1 / 0 / 2 |
| Elementos / arcos | 10 / 4 |
| Comprimento | 109,5 mm |
| Diâmetro máximo | 162,8 mm |
| Raios | 69,478304685 mm; 20 mm; 20 mm; 3,5 mm |
| Face Z0 / eixo Y CAD | direita / 174,5355806289 mm |
| Face traseira | limite original do furo, raio 7,1 mm; não estendida ao eixo |

A cadeia pode terminar acima do eixo. Não precisa inventar uma linha até X0 para ser válida. O teste de extensão ao eixo é desfeito antes do salvamento para conservar a face original.

O exemplo resolve o contorno externo e seu salvamento. As operações de furo/rosca, incluindo a anotação M39 passo 2, e a fixação não foram convertidas em uma preparação completa de máquina. Permanecem na fonte CAD para revisão própria. A demonstração de movimento contém somente o percurso geométrico do contorno; não é programa completo de produção. O simulador de desbaste G71 tipo II continua com a limitação documentada na 3.1.5.

## Evidência e arquivos

64 testes Node aprovados, incluindo o recorte do DXF real, ambiguidade, limites, original e quatro arcos intactos. Regressão legada aprovada, incluindo 232 verificações do leitor/simulador e 313 do diagnóstico.

`scripts/test-disco-real.cjs`, chamado por `pnpm test:ui`, usa o original quando disponível. Em Edge com banco temporário, importa o original, apaga auxiliares na cópia, quebra os trechos, verifica extensão/desfazer, seleciona o contorno, reproduz a folga, ajusta, desfaz/reajusta, salva e reabre depois de recarregar. Confere fonte, cotas, dados anteriores e arcos. Os demais fluxos de interface também são verificados pelo teste leve.

- `tests/disco-real-result.json`: resultado do caso real.
- `tests/disco-transfer-result.json`: desenho efetivamente salvo pela interface e rascunho CAD completo, para mesclagem.
- `tests/disco-before.png`, `tests/disco-after.png`, `tests/disco-perfil.png`: evidências visuais.
- `tests/fixtures/disco-7-gap.json`: recorte portátil do defeito para regressão; arquivo original completo não é necessário aos testes Node.
- `G:/GPT/SOLUCAO-Disco-7-3.1.6/`: exemplo de importação, recorte DXF superior, demonstração e instruções.

Para usar o exemplo salvo: abra a versão leve 3.1.6, entre em **Dados e backup**, escolha `Disco-7-desenho-e-CAD.json` e clique em **Mesclar e manter dados existentes**. Selecione **Disco 7 · perfil externo conferido** em Desenho da peça. Editar contorno no CAD reabre a fonte com os detalhes originais. A mesclagem não inclui ferramentas ou configurações de máquina e oferece backup anterior.

Fonte anterior em `G:/GPT/backups/react-3.1.5-antes-disco-real`. Entrega 3.1.5, base 2.15.0 e arquivos de exemplo originais preservados. Mapa consultado antes das alterações; configuração e trilha atualizadas. Build e entrega devem conter o mapa da mesma revisão, conferido e arquivado de forma imutável.
