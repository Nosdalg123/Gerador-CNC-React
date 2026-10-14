# Marca de autoria — 3.1.19

A versão React perdeu a marca que existia na base original. A referência foi confirmada em `base-github-v2.15.0/Gerador/index.html`, com o texto exato `Desenvolvido por Gladson Bernardo` e posicionamento fixo no canto inferior direito.

O texto foi restaurado em `src/App.jsx` como um elemento próprio da aplicação. `src/style.css` reproduz o comportamento da base: canto inferior direito, fundo e borda do painel, formato arredondado, baixa interferência visual e ocultação durante impressão. `pointer-events: none` impede que a assinatura bloqueie controles próximos.

O teste de interface de ferramentas verifica o texto renderizado na versão leve. O backup anterior está em `G:/GPT/backups/react-3.1.18-antes-autoria`.
