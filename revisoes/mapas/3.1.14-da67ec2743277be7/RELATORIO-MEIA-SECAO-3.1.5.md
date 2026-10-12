# Meia seção CAD e navegação — versão leve 3.1.5

## Causa encontrada

O conversor anterior aceitava somente cilindros/cones retos. A análise recusava todos os arcos; a auditoria recusava faces/degraus; o salvamento também bloqueava qualquer cópia editada ou com linhas ocultadas. Por isso, uma cadeia superior contínua podia ser recusada. A falta da metade inferior não era o motivo.

A imagem enviada é compatível com uma meia seção de torno, mas não contém os dados vetoriais do DXF. Não se pode comprovar suas ligações, centros ou eventuais retornos axiais somente pelos pixels. A correção foi validada com DXF de ensaio contendo face frontal, cone, degrau, arco circular, cilindro e face de fundo, terminando no eixo. Nenhum arquivo DXF real do exemplo foi apresentado nesta revisão.

## Comportamento da revisão

- Somente entidades inteiramente superiores ao eixo podem entrar no perfil CNC. Entidades que atravessam o eixo precisam ser quebradas no eixo e a parte superior selecionada. As inferiores permanecem cinza e tracejadas na edição, inclusive arcos, polilinhas, círculos e splines desenhadas. Não se espelha nem utiliza a metade inferior para completar o contorno.
- Uma cadeia superior com duas extremidades é válida sem fechar pelo contorno inferior. Faces radiais e arcos circulares são mantidos. Continuidade de 0,001 mm, unidade mm, Z0, comprimento, ramificações, raio e ausência de retornos em Z são conferidos. Retorno sobre uma face radial é recusado.
- `Usar comprimento do perfil` mede a cadeia superior. A maior cota auxiliar da folha deixa de ser imposta como comprimento de um perfil nativo válido. O comprimento informado ainda deve coincidir com a geometria selecionada.
- `+` / `−`, `Enquadrar desenho`, `Mover com mouse`, Shift + arraste, botão do meio e Ctrl + roda controlam a câmera. Não alteram medidas, seleção, confirmação ou CAD armazenado.
- A projeção de edição não sobrepõe números das entidades DIMENSION. Cotas, anotações, desenho original e alterações continuam armazenados no rascunho. Números de medidas permanecem acessíveis fora do desenho, na inspeção de uma entidade.
- O desenho guarda um `cadperfil` com caminho ordenado em Z/raio: segmentos LINE/ARC, centros, raios, orientação e referência de origem. Salvar mantém um rascunho com original mais delta; `cadOrigem.draftId` permite reabri-lo em `Editar contorno no CAD`.
- Um backup somente de desenhos, sem o rascunho correspondente, ainda reabre o caminho exato. Ele não pode recuperar referências, cotas ou entidades não incluídas naquele backup; a interface informa essa condição. Mesclagem com IDs de rascunho em colisão mantém ambos e remapeia a referência importada.
- O editor por elementos continua nos desenhos manuais. Um contorno CAD completo é editado pelo CAD, evitando adicionar cilindros incompatíveis ou desmontar seus arcos. Perfis internos importados continuam restritos a cilindros/cones alinhados à face externa; raios/roscas internos não são descartados silenciosamente para liberar o salvamento.

## CNC e limites

A validade geométrica permite guardar o desenho; o Gerador continua verificando comprimento preso, ferramentas, bruto e região livre. O teste com perfil fechado de 100 mm e 10 mm presos bloqueia a programação por alcance das castanhas. Nenhuma verificação de fixação foi removida para liberar uma meia seção completa.

O motor preserva faces em G1 e raios em G2/G3, subdividindo arcos acima de 90° em arcos circulares com o mesmo centro/raio. G71 nativo identifica contorno tipo II; seu desbaste no simulador continua aproximado tipo I e recebe advertência explícita. Não foi implementado um novo algoritmo de remoção tipo II nesta revisão. Acabamento e percurso circular são interpretados separadamente nos testes.

G72 é recusado para contorno nativo que sobe e desce em X, com indicação para escolher longitudinal G71 ou paralelo G73. Isso não impede salvar o desenho. A restrição corresponde à exigência de X monotônico documentada no [manual oficial Haas de programação do torno](https://www.haascnc.com/content/dam/haascnc/en/service/reference/programming-workbooks/lathe---programming-workbook.pdf). A seleção do tipo II e a exigência de Z monotônico para G71 estão descritas na [documentação oficial G71](https://www.haascnc.com/service/codes-settings.type%3Dgcode.machine%3Dlathe.value%3DG71.html). Esses documentos são referências do comportamento do ciclo; não comprovam suporte/configuração do torno do usuário.

Splines e elipses não foram convertidas em trajetórias CNC. Podem permanecer como referências; o perfil selecionado deve ser completamente representado por linhas e arcos circulares. O ensaio não é validação de usinagem em máquina real.

## Validação e preservação

- `pnpm test`: 61 testes, incluindo sete novos testes de meia seção, reflexo esquerda/direita, centro circular interpretado, lacunas, bifurcações, retorno axial, G72 incompatível/compatível, prévia, fixação e colisão de IDs em backup.
- `pnpm test:legacy`: suíte dos motores e PDFs/DXF aprovada; 232 verificações do leitor/simulação e 313 do diagnóstico sem falhas.
- `pnpm test:ui`: Edge em servidor loopback e perfil temporário. Sete geradores, PDF, CAD anterior, operações DXF, editor por elementos, persistência, Unicode, cópia anterior e alteração externa. Novo teste `scripts/test-cad-half.cjs` verifica zoom/arraste reais, desenho original intacto, limpeza, metade inferior excluída, números removidos, lacuna ainda bloqueada, salvar/reabrir após recarregar e backup somente de desenhos.
- Resultados: `tests/cad-half-result.json`, `tests/light-result.json`; captura `tests/cad-half.png`. O perfil real `%APPDATA%/CNC Torno React/workspace.json` não foi utilizado nos testes.
- Fontes anteriores guardadas em `G:/GPT/backups/react-3.1.4-antes-meia-secao`. Pacotes 3.1.4 e anteriores e base GitHub 2.15.0 preservados.
- Mapa obrigatório consultado, vocabulário/trilha atualizados, revisão conferida e arquivada. A distribuição leve inclui `mapa/` da mesma revisão do build.

Abra a pasta completa `CNC-Torno-Leve-3.1.5` pelo lançador `Iniciar-CNC-Leve.cmd`; feche a janela anterior antes de usar a nova. Os mesmos dados Windows permanecem no caminho existente.
