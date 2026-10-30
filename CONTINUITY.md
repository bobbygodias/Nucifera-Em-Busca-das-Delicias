# CONTINUITY — Nucífera: Em Busca das Delícias

## Identidade e objetivo
Projeto social gratuito e offline, com narrativa infantil, dez regiões, jogo de plataforma e fase de motocicleta. Preservar personagens, arte, sonoplastia, apresentação e o APK publicado. A referência publicada é a versão `v0.1.7-prototipo`; esta branch **não altera o jogo nem publica versão nova**.

## Arquitetura essencial
- `index.html`: interface e apresentação.
- `game.js`: fluxo, fases, pontuação e áudio.
- `motorcycle.js`: simulação da corrida e renderização. A API `NuciferaRace` também é exportada via CommonJS, permitindo testes Node sem navegador.
- `assets/`: mídias; `android/`: empacotamento Android; `docs/`: documentação.
- `tests/motorcycle.test.cjs`: regressões determinísticas da simulação, sem testar vídeo, áudio, interface ou APK.

## Checkpoint de engenharia — 30/10/2026
Antes desta proposta, a consulta à API GitHub retornou **zero execuções de Actions** para o repositório. Foi aberta a branch `test/race-engine-ci-20261030` para adicionar testes da fase de moto e um workflow de smoke test JavaScript, sem alterar código de produção, arte, identidade visual ou a release. CI verificada em 30/10/2026: run 40994643676, job `race-engine`, **SUCCESS**, incluindo `node --check` e os cinco testes. Isso valida apenas a lógica pura da corrida, não o aplicativo Android.

## Critérios e limites
- Verificar `node --check game.js`, `node --check motorcycle.js` e `node --test tests/motorcycle.test.cjs`.
- Testes cobrem limites de faixa, cooldown de turbo, determinismo, restauração de estado e término aos 60 segundos.
- Ainda faltam testes visuais/táteis no Android, vídeo e áudio, acessibilidade e validação de assets empacotados.
- Não mesclar ou publicar release sem revisão e validação. Se houver falha, ler o log e corrigir na branch; não suprimir o teste.

## Próximos passos
1. Conferir CI do PR e corrigir falhas de teste reais, se houver.
2. Avaliar testes de assets referenciados e execução em Android 5+ sem regressão visual.
3. Preservar README, licença MIT e documentação de compilação.

## Checkpoint de assets — 30/10/2026
- Ampliada a cobertura da branch draft, sem tocar no código do jogo, mídias, README ou APK.
- Novo teste em \`tests/assets.test.cjs\`: valida referências estáticas \`assets/...\` em HTML, JS e CSS de layout Android, além dos pontos de entrada \`img\`, \`video\` e \`script\` no HTML; verifica que os arquivos existem e não estão vazios.
- Workflow atualizado para verificar assets e arquivos HTML de entrada quando modificados, com \`contents: read\` e testes Node sem dependências adicionais.
- A cobertura é **estática**: não executa vídeo/áudio, WebView, Android, renderização, nem valida caminhos criados dinamicamente ou a integridade da mídia. Falhas devem ser investigadas antes de qualquer merge.
- A confirmação final do GitHub Actions (run e status) será registrada no PR e no diário após a execução.
