# Aviso de conexão e CAD com dois lados · versão leve 3.1.12

O círculo verde marca um encontro corrigido por Conectar linhas ou Ligar falhas. Não é uma entidade nova do perfil. O desenho já mostrava o marcador sem explicação e a cor verde prevalecia sobre o laranja da seleção, fazendo os cliques parecerem sem efeito. Quando as linhas já estavam unidas, Conectar também deixava a primeira seleção pendente.

A seleção agora prevalece: laranja para perfil marcado, roxo para o primeiro elemento de uma edição, verde para correção sem seleção. Marcadores coincidentes não duplicam círculo/número e o círculo fica transparente. Eles e o aviso não interceptam os cliques nas geometrias. Ao tentar conectar elementos já unidos a até 0,001 mm, o editor informa que nenhuma alteração é necessária e libera a seleção pendente, sem criar edição ou invalidar a confirmação.

Depois de uma correção, um aviso com seta aponta ao círculo por 3 segundos. Passar o mouse perto do marcador mostra o aviso novamente. A posição acompanha zoom e movimento. Desfazer e restaurar limpam o aviso; histórico, delta e medidas permanecem.

Na etapa Salvar desenho do DXF, **Salvar também lado 2 invertido** grava os dois perfis completos. Um desenho CAD existente também pode usar **Criar lado 2 invertido** em Desenho da peça. O lado 2 é a mesma geometria vista da outra face: ordem dos segmentos e coordenada Z invertidas, novo Z0, raios e centros transformados exatamente. Os arcos continuam circulares.

Conforme escolha do usuário, cada lado começa com metade do comprimento da peça. Os campos **Comprimento a usinar · lado 1/2** ficam no desenho e são salvos junto dele. A geração recorta somente o percurso da operação; o modelo completo de cada lado permanece intacto. Limites dentro de arcos mantêm o círculo e ajustam apenas sua extremidade. Comprimentos inválidos, faixas sem usinar, perfis divergentes e invasão da parte presa continuam bloqueados. Sobreposição entre operações é permitida apenas neste modelo da mesma peça invertida e permanece informada pelo motor.

**Primeiro lado a usinar** pode ser escolhido no desenho e no Gerador. A geração reorganiza a preparação: a primeira operação começa no bruto e a segunda considera o perfil anterior após virar a peça. Fixação, sentidos, operações e origem de furo preexistente são associados ao lado escolhido. Os botões Lado 1/Lado 2 selecionam seu código e simulação. Nome dos programas, identificação física dos lados e mensagens acompanham essa ordem.

O lado selecionado também reabre no CAD. Salvar mantém ambos os contornos e os limites, gerando uma nova revisão como o fluxo anterior. Perfis internos passantes de cilindros/cones e broca passante podem ser invertidos; operações internas parciais/complexas exigem preparação própria e não são inventadas pela inversão automática. A tentativa incompatível conserva o desenho existente.

Validação:

- 88 testes unitários aprovados: inversão reversível, arco/centro/raio, recorte em arco e cone, limites, dados preservados, perfil divergente, fixação, ordem e interpretação dos dois programas. O perfil do Disco 7 mantém quatro arcos em cada vista e gera os dois lados nas duas ordens.
- `pnpm test:legacy` aprovado nos motores, geradores, PDF, diagnóstico e DXF.
- `pnpm test:ui` completo aprovado: sete geradores, mouse/zoom, conexões de arcos, DXF original Disco 7, etapas CAD, dois lados, editor por elementos, máquinas/ferramentas, persistência e proteção contra sobrescrita externa. Banco real não utilizado nos testes.
- Teste Edge com banco temporário: aviso/seta/expiração, cliques reais nas linhas corrigidas, seleção e conexão já feita, metade inicial, ajuste 60/40 mm, salvar/reabrir, escolher a ordem, códigos e simulação, editar lado 2 sem perder lado 1 e salvar diretamente os dois lados pelo CAD.
- Evidências: `tests/cad-dual-result.json`, `tests/aviso-conexao.png`, `tests/desenho-dois-lados.png`, `tests/gerador-lado2.png`, `tests/cad-salvar-dois-lados.png`.

Backup: `G:/GPT/backups/react-3.1.11-antes-lados-cad-avisos`. Distribuição 3.1.11, DXF original e dados reais preservados. Trilha e vocabulário atualizados; mapa correspondente ao build incluído no pacote leve.
