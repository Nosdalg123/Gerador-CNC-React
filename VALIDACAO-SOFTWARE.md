# Validação da versão 3.1.0

- Build React/Vite aprovado.
- Motor original: 232 verificações de interpretação/simulação e 313 de diagnóstico, zero falhas. Dezesseis programas de referência lidos e conferidos.
- Cinco suítes de PDF existentes aprovadas: cotas, projeção, escala, disco e orientação CNC.
- Seis regressões novas aprovadas: diâmetro efetivo, T inválido, G83 incompleto, variável de sistema, migração com colisão de IDs e descarte de leitura PDF atrasada.
- Interface exercitada no Chrome e no executável Electron: login, seleção dos sete geradores, geração inicial, avanço da simulação por bloco, desenho, ferramentas, backup e leitura de um PDF vetorial de teste.
- O teste PDF seleciona uma região, define eixo e face Z0, confirma o perfil, verifica que salvar está habilitado e muda o zoom para verificar que a confirmação foi invalidada.
- Executável Windows x64 iniciou com motores e API de persistência disponíveis.

Resultados estruturados: `tests/ui-result.json`, `tests/ui-desktop-result.json` e `tests/desktop-smoke.json`. Captura de interface: `tests/interface.png`. A captura de janela desktop oculta foi excluída do teste, pois não produz frames para a ferramenta de captura; as operações e asserções DOM foram realizadas.

Os dados de teste são isolados dos dados da versão antiga. A transferência de bancos reais armazenados no navegador depende da exportação pelo usuário; a compatibilidade e a mesclagem foram verificadas com dados de teste. Não foi executada usinagem real. Veja `VALIDAR-NA-MAQUINA.md`.

## Base 2.15.0 — atualização 3.1.0

Commit de origem: 263caabb18557eedc1e399cf812241614105eda2. Novos módulos CAD e seleção PDF integrados. Nove regressões locais aprovadas; suíte original e testes de PDF/Copo, parser DXF, cadeias, auditoria e edição aprovados. Teste CAD na interface e no executável: proposta automática, persistência de rascunho no workspace, extensão, desfazer, original intacto, retorno ao painel após navegar, transferência manual bloqueada, revisão completa e invalidação após edição. Resultados: tests/cad-ui-result.json e tests/cad-desktop-result.json. DXFs industriais externos Disco/Copo não estão nesta pasta; seus testes opcionais de arquivos reais não foram reexecutados.
