# Cilindragem protegida — 3.1.17

A versão anterior bloqueava a geração quando a rampa ou fresta não podia ser alcançada pelo desbaste externo atual. Agora mantém o perfil acessível até esse ponto e continua em cilindragem no maior diâmetro da peça completa, até o comprimento escolhido no Gerador. O desbaste e o acabamento usam a mesma cópia protegida; nenhum deles percorre o rebaixo omitido.

O maior diâmetro é calculado também nas extremidades internas dos arcos, não apenas nas pontas. Para dois lados, o cálculo usa o perfil completo salvo antes de recortar o comprimento. O prefixo circular acessível conserva centro, raio e sentido; o trecho inacessível fica pendente para a outra face ou uma operação própria. Um aviso informa Z de início, diâmetro protegido e comprimento de usinagem.

Os dois perfis originais, IDs, dados e comprimentos permanecem preservados. Não se equilibram os comprimentos nem se aumenta automaticamente a profundidade. A conferência de castanha, comprimento, bruto e consistência CAD permanece ativa.

No exemplo de 109,5 mm com comprimentos de 3 mm e 104 mm, existe uma faixa de 2,5 mm fora das duas operações. Ela permanece no bruto. Para retirar essa faixa, aumente um dos comprimentos no Gerador, desde que a fixação permita; a cilindragem protegida funciona dentro do comprimento programado. Não se autoriza movimento além do limite por causa da imagem de referência.

Validação: testes de geometria verificam continuação até o limite, maior diâmetro, preservação de arcos acessíveis e ausência de alterações no desenho. O Disco 7 é simulado nos dois lados e testado na interface com cilindragem protegida a 40 mm e com seleção independente de profundidades. A tentativa de ultrapassar a castanha continua bloqueada. Os testes de interface utilizam banco temporário.

O simulador confere a geometria e o percurso representados pelo aplicativo. A preparação real da máquina e o comportamento específico do comando precisam ser conferidos antes do corte.

Mapa local inspirado no Graphify consultado, atualizado e incluído nesta distribuição. O produto Graphify oficial não é executado por este fluxo.
