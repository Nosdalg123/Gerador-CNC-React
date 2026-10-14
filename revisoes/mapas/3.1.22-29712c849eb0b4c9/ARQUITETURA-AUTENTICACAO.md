# Arquitetura e dependentes da autenticação — React 3.1.2 leve

Análise com a skill `G:/GPT/.agents/skills/mapeador-grafo/SKILL.md`, o mapa vigente e conferência dos trechos indicados. `graphify.out` não existe nas raízes do projeto/workspace; foi usada a alternativa de análise estrutural local prevista na skill. Não foi instalado outro indexador.

## Onde está a autenticação

Não existe um arquivo `auth` ou módulo de autenticação separado. A implementação está concentrada em `src/App.jsx`:

| Ponto | Evidência | Relação |
|---|---|---|
| Perfis `admin`, `simu`, `desenho`, hashes e telas permitidas | linha 11 | `[EXTRACTED]` declaração local |
| Estado de usuário e sessão `cnc.usuario.v1` | linha 14 | `[EXTRACTED]` leitura do sessionStorage |
| `can(view)` | linha 20 | `[EXTRACTED]` verifica telas do perfil |
| `navigate(v)` | linha 21 | `[EXTRACTED]` chama `can` antes de navegar |
| `useDrawing` | linha 22 | `[EXTRACTED]` chama `can('gerador')` ao escolher destino |
| Validação da senha e criação da sessão | linha 25 | `[EXTRACTED]` SHA-256 com prefixo local e sessionStorage |
| Menu filtrado e encerramento da sessão | linha 26 | `[EXTRACTED]` callback chama `can`; logout remove a chave |
| Ação “Usar no Gerador” do desenho | linha 29 | `[EXTRACTED]` callback testa `can('gerador')` |

## Arquivos que dependem dessa raiz

| Arquivo | Tipo de dependência | Evidência |
|---|---|---|
| `src/main.jsx` | **Direta `[EXTRACTED]`** | importa App na linha 3 e renderiza na linha 6 |
| `index.html` | **Transitiva `[EXTRACTED]`** | carrega `src/main.jsx`, que importa App |

O grafo retorna exatamente esses dois consumidores ao consultar `--impact src/App.jsx`. É uma dependência da raiz que contém a autenticação e também a navegação/persistência, não uma prova de importação de um serviço auth independente.

## Telas afetadas pelas permissões

`App.jsx` importa/renderiza as telas abaixo. Elas não importam `App`, `can` ou os perfis; a raiz controla menu, vista selecionada e ações passadas por propriedades. Portanto, o impacto de uma mudança de permissão nelas é **funcional `[INFERRED]`**, apoiado nas chamadas/propriedades e na montagem JSX **`[EXTRACTED]`**:

| Arquivo | Controle recebido da raiz |
|---|---|
| `src/components/Generator.jsx` | acesso ao Gerador e abertura do desenho |
| `src/components/Drawing.jsx` | navegação PDF/CAD e callback de geração, com `can('gerador')` |
| `src/components/Tools.jsx` | acesso ao banco de ferramentas |
| `src/components/Program.jsx` | acesso à simulação; `Simulation.jsx` é montado dentro deste fluxo |
| `src/components/PdfImport.jsx` | acesso ao PDF e callbacks `onSave`/`onManual` |
| `src/components/CadImport.jsx` | acesso ao CAD e callbacks de salvar, editar e voltar |
| `src/components/Backup.jsx` | acesso a dados e backup |

Configurações ficam no próprio `App.jsx`, sem componente de página separado. `Common.jsx` fornece Field/Messages para o formulário de login: essa dependência vai **de App para Common**, não de Common para a autenticação.

| Perfil | Telas permitidas atualmente |
|---|---|
| admin | Gerador, desenho, PDF, CAD, ferramentas, simulação, configurações e dados |
| simu | Simulação, ferramentas e dados |
| desenho | Desenho, PDF, CAD e dados |

## Testes e partes independentes

`scripts/test-ui.cjs:2`, `scripts/test-cad.cjs:4` e `scripts/test-parity-ui.cjs:8` entram pelo formulário, usando os controles “Senha” e “Entrar”. Dependem funcionalmente desse fluxo e dos textos dos controles; não importam o código de autenticação nem manipulam diretamente a chave de sessão. `scripts/test-light.cjs` executa os três e é afetado transitivamente.

`src/data.mjs`, `src/domain.mjs` e os motores `public/engine/` não dependem do login de usuários. `lightweight/Servidor-CNC.ps1` valida token/origem da API local, separadamente dos perfis de `App.jsx`. A validação do servidor não recebe usuário, senha ou as permissões dessas telas. O login atual é uma restrição de uso local da interface, conforme sua própria mensagem.

## Reproduzir a consulta

```powershell
pnpm mapa:query --query "autenticação login"
pnpm mapa:query --symbol can --file src/App.jsx
pnpm mapa:query --callers can --file src/App.jsx
pnpm mapa:query --callees App --file src/App.jsx --limit 35
pnpm mapa:query --impact src/App.jsx
```

Nenhuma regra de login, senha, perfil ou permissão foi alterada nesta análise.
