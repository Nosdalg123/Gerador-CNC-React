# Dois lados no CAD e comprimentos no Gerador — 3.1.15

Na etapa 3 do DXF, o contorno válido produz automaticamente a prévia do lado 1 e do lado 2 invertido. Cada botão contém uma miniatura; selecionar um lado mostra sua meia seção completa. Gerar lado 2 invertido refaz a inversão e marca a opção de salvar ambos. As duas caixas de confirmação estão em linhas separadas. A criação automática conserva raios, centros e sentido dos arcos e não altera o DXF original.

Salvar também lado 2 vem marcado para novos DXFs. Ao salvar, ficam gravados os perfis completos em trechos1/trechos2 e os internos representáveis em internos1/internos2. Reabrir um desenho existente conserva seu ID, campos adicionais e parâmetros do Gerador; o salvamento atualiza esse desenho, sem criar outro registro com o mesmo ID. Ao reabrir apenas o contorno salvo, os internos existentes também são conservados.

Os comprimentos a usinar e a primeira operação são definidos no Gerador. Os comprimentos ficam em form.cadUsinagem[desenhoId] e começam com metade por lado. Valores antigos em cadDuplo.limite1/limite2 continuam preservados e servem de padrão para os desenhos antigos. A geração aplica os limites a uma cópia, sem recortar os perfis salvos. Comprimentos inválidos, faixa sem cobertura e falta de espaço para fixação continuam bloqueando o código. Backups remapeiam esses parâmetros quando houver colisão de IDs.

O perfil interno parcial não é espelhado inventando uma operação na outra face. Se não for representável, a etapa 3 informa por que a inversão não foi possível e impede salvar ambos; o contorno e o rascunho continuam disponíveis para revisão.

Arquivos principais: src/cad-sides.mjs, src/cad-document.mjs, src/components/CadImport.jsx, Generator.jsx, Drawing.jsx, App.jsx, src/data.mjs e public/engine/dxfimport.js. Testes: tests/cad-sides.test.cjs e scripts/test-cad-dual.cjs, além do DXF original Disco 7 e da suíte completa da versão leve em banco temporário.
