# Conectar arcos e retas · versão leve 3.1.9

O editor rejeitava arcos no primeiro clique de Conectar linhas e não habilitava Ligar falhas para pares arco/arco. Ambos os comandos passam a aceitar arcos e retas, inclusive trechos circulares de polilinhas.

Conectar linhas calcula a interseção exata entre reta/círculo ou círculo/círculo. Ajusta as extremidades mais próximas até esse encontro; quando necessário, encurta a extremidade cujo encontro está dentro do elemento. Na mesma circunferência, usa o ponto angular intermediário entre as pontas próximas. Conserva centros, raios, sentido e metadados. Encontros igualmente próximos ou ajustes maiores que 10000 mm falham sem edição parcial. O comportamento anterior entre duas retas permanece.

Ligar falhas mantém o limite estrito de menos de 0,2 mm, com vizinhos únicos mútuos. Entre reta e arco, conserva a ancoragem da reta ao arco já validada no Disco 7. Entre arcos, ajusta os ângulos até o encontro circular próximo, respeitando também o percurso angular permitido. Não altera centro ou raio e não transforma o arco em uma aproximação por segmentos.

Quando os círculos não permitem um encontro próximo, cria um trecho reto curto e explícito entre as pontas, mantendo os arcos intactos. O trecho herda a seleção quando seus dois elementos estavam no mesmo perfil. A correção automática não fecha as pontas de uma cadeia já conectada, não escolhe nós ambíguos e não cria uma ligação que atravesse outro elemento selecionado. Pontas já conectadas não geram falso aviso de ambiguidade por causa da ligação curta.

Os dois comandos destacam alterações em verde e numeram os encontros. O texto identifica a ligação reta criada. Desfazer restaura geometria e seleção. Rascunho, salvamento e reabertura conservam ângulos, ligações, marcadores e fonte original. A auditoria do perfil superior e a confirmação das cotas continuam necessárias para liberar o desenho ao Gerador.

Validação:

- `pnpm test`: 79 testes aprovados; 11 casos específicos cobrem sentidos horário/anti-horário, ordem dos cliques, tangência, secância, mesma circunferência, encontro dentro do elemento, polilinhas/metadados, limite, ocultação, ambiguidades, ligações reversíveis e travessia de outro elemento.
- Perfil corrigido convertido em contorno CNC com dois arcos circulares e interpretado no simulador sem erros.
- `pnpm test:legacy`: regressões dos motores, geradores, diagnóstico, PDF e DXF aprovadas.
- `pnpm test:ui`: Edge com banco temporário; cliques reais arco/arco e reta/arco, ambas as funções, seleção da ligação curta, destaque verde, ausência de falso aviso, desfazer, salvamento e reabertura aprovados. Suíte anterior de CAD, Disco 7, peças por elementos, máquina, ferramentas e preservação também aprovada.
- Evidência: `tests/dxf-arc-connections-result.json` e `tests/conexao-arcos.png`.

Fontes: `public/engine/dxfgeometry.js`, `public/engine/dxfimport.js`, `src/assets/cad-panel.html`. Testes: `tests/dxf-arc-connections.test.cjs`, `scripts/test-dxf-arc-connections.cjs`, `scripts/test-light.cjs`. Trilha e vocabulário do mapa atualizados; a entrega inclui o mapa correspondente ao build.

Backup: `G:/GPT/backups/react-3.1.8-antes-conectar-arcos`. Pacote 3.1.8, base histórica e DXF original preservados. Nenhum teste foi executado contra o banco real do usuário.
