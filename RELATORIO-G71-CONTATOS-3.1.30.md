# G71 por passes e detecção de contatos — 3.1.30

## Reprodução

`tests/fixtures/g71-user-3.1.30.json` preserva o programa informado e os parâmetros da imagem: ferramenta externa, formato personalizado (80° padrão), raio 1 mm, IC 16 mm, haste 25 mm, suporte κ 90°, vertical, inserto à esquerda, montagem inferior esquerda e campos de incremento vazios. A reprodução utiliza bruto Ø51, face Z0 e comprimento livre 100 mm, sem acessar o banco real.

Falhas encontradas na 3.1.29:

1. G71/G72 expandiam o ciclo, mas o leitor voltava a executar os blocos P…Q como movimentos normais, fazendo um perfil sem sobremetal antes de um G70 explícito. A cena numérica do Gerador reproduzia a mesma passada extra.
2. Todos os movimentos do G71 tinham a mesma linha e nenhuma identificação de passe. “Bloco →” executava todo o ciclo em um clique.
3. O G71 parava no primeiro cruzamento do perfil por camada. Cavidades posteriores não eram desbastadas antes do contorno com sobremetal.
4. O limite de engajamento era obtido apenas dos campos do banco. Com esses campos vazios, o U1.5 do programa não era comparado com o contato real. Além disso, a contagem mínima por amostra podia omitir contatos pequenos e persistentes na malha.
5. Os endereços C1.5 e C.5 do exemplo não geravam os chanfros. A ausência de ferramenta em T0000 podia ser resolvida automaticamente por uma geometria externa única.

## Correções

- P/Q é definição do G71/G72, sem execução normal implícita após a chamada. O G70 continua explícito. Corrigida também a cena do Gerador, mantendo a paridade com o código exportado.
- Passes identificados em G71/G72 externos e internos. A navegação por bloco avança uma camada; o contorno com sobremetal aparece como etapa própria. No caso informado são 16 camadas longitudinais efetivas e um contorno com sobremetal; o nível puramente tangente ao piso é omitido como passe vazio. O passo radial máximo continua 1,5 mm, equivalente a 3 mm de variação em X.
- Interseções de cada nível com o perfil inteiro, incluindo bolsões entre ressaltos e os dois arcos. Transferências usam o diâmetro de aproximação e entradas de bolso em avanço. Reversões em Z usam o envelope conservador das interseções e mantêm o aviso `cicloEixo`; essa prévia não confirma a aceitação do perfil pelo comando.
- Contexto do ciclo acompanha movimentos, compensação, worker e segmentos. G71 usa U no raio; G72 usa W em Z. O menor entre limite conhecido do banco e profundidade do ciclo prevalece. Sem qualquer limite conhecido, a interface informa que a comparação de incremento está incompleta, mantendo as verificações geométricas.
- Haste/suporte contra material restante e placa antes da remoção. Contatos significativos de uma célula já geram alerta, mantendo a tolerância geométrica de borda. O inserto continua removendo seu volume varrido: uma remoção após um contato indevido não é apresentada como prova de corte permitido.
- Aviso de contato acima da animação, navegação ao primeiro contato e marca vermelha na célula material/ferramenta. Os alertas retêm a coordenada de contato, separada da referência programada da ferramenta.
- Chanfros C positivos em duas retas perpendiculares, respeitando X em diâmetro e distâncias reais no plano Z/raio; formatos sem próximo movimento compatível são recusados. Ex.: X20C1.5 gera entrada X17 Z0 e saída X20 Z-1.5. C.5 em X40 gera X39 e deslocamento Z de 0,5 mm.
- Profundidade ausente/zero, recuo negativo e limites excessivos de expansão são recusados; formato de um bloco com D explícito é reconhecido. T0000 em corte produz diagnóstico e exige associação explícita no trabalho; o banco não é modificado.

## Pontos a conferir no programa original

- `G71U1.5Z2`: no formato ISO de dois blocos documentado, o recuo é R. Z não é convertido automaticamente em R; a prévia usa o recuo padrão de 0,5 mm na ausência de R e informa isso.
- O perfil contém cavidades, mas `N10G0X0` não declara Z/W para tipo II. A prévia cobre os bolsões por níveis e avisa sobre essa diferença. Confirme no comando o suporte e a ativação do G71 tipo II, inclusive W0 quando aplicável.
- Há `T00` antes do G70 final, sem selecionar novamente uma ferramenta com corretor. Confirme a ferramenta física e a semântica de T00. Para analisar esse trecho, selecione explicitamente a geometria de T0000 na tela; o sistema não presume que seja a T0101 ou T0301.

Nenhuma dessas sugestões reescreve automaticamente o programa.

## Referências e verificação

[Siemens — programação ISO de torneamento, G71, páginas 67–68](https://support.industry.siemens.com/cs/attachments/67312729/808D_OPT_Part_3_Programming_ISO_1212_en_en-US.pdf): profundidade U no raio, R para recuo e U/W de acabamento. [Siemens — ISO Turning, distinção tipo I/tipo II, página 81](https://support.industry.siemens.com/cs/attachments/109769430/840Dsl_iso_turning_progr_man_0619_en-US.pdf): ativação por eixos no primeiro bloco e W0. [Haas — G01, chanfro automático](https://haascnc.com/service/codes-settings.type%3Dgcode.machine%3Dlathe.value%3DG01.html.html): distância do canto teórico ao início/fim do chanfro; a sintaxe Haas usa vírgula antes de C. Esses documentos não demonstram a configuração específica da máquina do usuário.

`g71-contact-regression.test.cjs` cobre o programa literal, camadas, material intermediário e sobremetal, bolsões, incrementos vazios e prioridade dos limites, haste em G0, chanfros, G70 explícito, tipo II, orçamento de expansão e associação de T0000. `test-g71-contact.cjs` reproduz o cadastro pela interface, associa as ferramentas, verifica “Bloco →”, banner, marcador vermelho e preservação do programa/banco em navegador isolado. `testprog.js` mantém paridade de material, tempo e alertas entre geração e interpretação e os 16 programas históricos.

A regressão concorrente do mapa também revelou EPERM transitório ao ler um lock existente no Google Drive para Windows. `code-map.cjs:withMapLock` agora aguarda a liberação, mantendo o limite de 15 segundos e sem remover um lock inacessível por suposição. O teste existente de três processos verifica revisão única e íntegra.

Persistem os limites do modelo 2D XZ e da malha de 0,5 mm; a região ativa do inserto é uma verificação geométrica conservadora, não uma análise de força ou garantia de execução na máquina. Mapas e Graphify são atualizados no fechamento, inclusive após correções de testes. Distribuição leve em pasta, sem compactação automática; entregas e dados anteriores preservados.
