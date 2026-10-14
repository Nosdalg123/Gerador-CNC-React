# Revisão da conversão — 3.1.1

Base de comparação: código original GitHub 2.15.0, commit `263caabb18557eedc1e399cf812241614105eda2`. A base original não foi editada. Cópia da versão React anterior em `G:\GPT\backups\react-3.1.0-antes-croquis`.

## Perdas e erros corrigidos

| Situação encontrada | Correção |
|---|---|
| Espina sem croqui cotado | SVG original com seis cotas editáveis A–F e G calculado |
| Porta-matriz sem croqui cotado | SVG original com as 12 cotas, cavidades e identificação dos lados |
| Prévia da peça como bloco preto | Estilos de bruto, peça, eixo, furos e paredes internas recuperados |
| C e D digitados como texto podiam ser concatenados | Conversão numérica antes dos cálculos e da geração |
| Campo vazio podia virar zero | Vazio numérico vira NaN, como no formulário original; limites opcionais usam cálculo automático |
| Limites automáticos sem indicação | Placeholders originais recuperados |
| Incremento zero desaparecia da tela | Zero permanece visível; botão para retornar aos parâmetros do banco |
| Campos avançados misturados com medidas comuns | Agrupamento original em seções recolhíveis |
| Seleção vazia ou desenho excluído podia usar outra peça | Seleção explícita respeitada; geração bloqueada se não existir |
| Lista de ferramentas sem filtro de tipo | Ferramentas compatíveis com o papel; escolha anterior preservada para validação |
| Escolha vazia na simulação podia recuperar ferramenta do banco | Pastilha padrão respeitada; códigos T repetidos consideram o tipo sugerido |
| Canal frontal ausente nas orientações | Opção recuperada; sugestões de canal e rosca respeitadas |
| Desenhos de inserto e suporte ausentes | Geometria original recuperada no cadastro e na leitura de programa |
| Avisos de compensação G41/G42 ausentes do diagnóstico | Avisos da cena acrescentados ao diagnóstico |
| Desfazer correção podia apagar edição manual posterior | Histórico de correções invalidado ao editar o texto |
| Furação nova recebia giro padrão M4 | Nova broca começa com G97/M3; parâmetros de ferramentas existentes preservados |
| CAD incompleto impedia também a prévia de revisão | Prévia geométrica independente do bloqueio de geração; cadastro e revisão não são alterados |
| Prévia dependia das ferramentas cadastradas | Ferramentas de referência para visualização, com broca/canal ajustados à geometria |
| Canto interno não considerava o furo piloto | Raio do furo utilizado na identificação dos cantos |
| Perfil final ausente do canvas da simulação | Contorno externo e cavidades mostrados como referência |

Há sete geradores funcionais na base. Somente espina e porta-matriz possuíam esses croquis com caixas sobre as cotas; nos outros, a visualização é a meia seção calculada, que também foi conferida. Croquis são esquemáticos; a prévia representa a geometria calculada.

## Distribuição leve

`Iniciar-CNC-Leve.cmd` abre uma janela de aplicativo no Microsoft Edge instalado no Windows. Um servidor PowerShell atende somente `127.0.0.1`. Não exige Node, Electron ou downloads em tempo de uso. Se o Edge não estiver no caminho padrão, abre no navegador padrão. Reabrir o atalho reutiliza o servidor ativo.

Todos os arquivos de `dist` foram comparados por SHA-256 com a versão leve: são idênticos. PDF, worker, mapas de caracteres, fontes, bibliotecas DXF e motores CNC continuam no pacote. A economia vem de reutilizar o navegador instalado.

| Distribuição | Tamanho medido |
|---|---:|
| Electron 3.1.1 completo | 391.632.021 bytes (391,6 MB) |
| Versão leve extraída | 6.166.640 bytes (6,2 MB) |
| ZIP da versão leve | 2.962.685 bytes (3,0 MB) |

Redução dos arquivos distribuídos: **98,43%**, sem contar o navegador que já existe no computador. Memória usada e espaço do Edge são separados desse tamanho.

O ZIP é `G:\GPT\CNC-Torno-Leve-3.1.1.zip`. Extraia tudo e execute `CNC-Torno-Leve\Iniciar-CNC-Leve.cmd`. Electron atualizado em `release\3.1.1\CNC-Torno-win32-x64`; original e versões anteriores preservados.

## Dados e validação

As duas versões usam `%APPDATA%\CNC Torno React\workspace.json`, com cópia anterior em `workspace.json.previous`. Feche uma versão antes de abrir a outra. Arquivo inválido ou alterado por outra sessão não é sobrescrito: a sessão continua permitindo exportar um backup.

Testes não acessaram o perfil real: cada execução usou pasta temporária. Nenhum banco real de ferramentas, desenhos ou rascunhos foi regravado pelo processo de atualização.

- 14 testes de regressão da versão React aprovados.
- Testes da base: 232 verificações de interpretação/simulação, 313 de diagnóstico, programas de referência e testes de PDF/DXF aprovados.
- Interface: sete geradores com código e perfil, 18 cotas editáveis, soma G, zero nos incrementos, desenhos de ferramenta e giro inicial da broca.
- PDF: carregamento, recorte, confirmação e invalidação após mudar a vista.
- DXF: reconhecimento, rascunho persistido, extensão, desfazer, preservação do original, bloqueio antes da revisão e invalidação após nova edição.
- Versão leve no Edge: recursos idênticos, persistência, acentos, campos extras, backup anterior, rejeição de dados inválidos, proteção contra alteração externa e reabertura do servidor.

Comandos de reprodução: `pnpm test`, `pnpm test:legacy`, `node scripts/test-light.cjs`, `node scripts/test-parity-ui.cjs --desktop`, `node scripts/test-ui.cjs --desktop`, `node scripts/test-cad.cjs --desktop`.

Os testes confirmam o comportamento do software. A revisão de código e fixação no comando continua necessária antes de usinar, conforme a própria interface já orienta.
