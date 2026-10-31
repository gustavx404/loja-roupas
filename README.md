# MOVO — loja online

Vitrine de roupas casuais e de treino, com sacola, pedido pelo WhatsApp e área administrativa. O backend usa Supabase Postgres e Storage; funções Netlify mantêm as credenciais administrativas fora do navegador.

## Configurar Supabase

1. Crie um projeto Supabase e copie a Project URL e uma Secret API key (`sb_secret_...`). Não use nem publique a chave no frontend.
2. No Supabase, abra **SQL Editor**, cole e execute o conteúdo de `supabase/migrations/20261031014638_initial_movo_schema.sql`. Isso cria catálogo, administrador e sessões; ativa RLS; remove permissões de `anon` e `authenticated`; e cria um bucket privado de imagens limitado a 2 MB e JPG/PNG/WebP.
3. No Netlify, abra **Project configuration → Environment variables** e adicione `SUPABASE_URL` e `SUPABASE_SECRET_KEY`. Marque a chave como secreta e habilite o escopo **Functions** para produção.
4. Faça um novo deploy do site para as variáveis entrarem nas funções.
5. Para criar o primeiro acesso no banco de produção, configure as mesmas duas variáveis na sua sessão local do PowerShell e execute `npm.cmd run admin:create`. O usuário e a senha são escolhidos no terminal; não há credencial padrão.
6. Para redefinir uma conta existente, com as variáveis apontando para o projeto Supabase de produção, execute `npm.cmd run admin:reset`. Ele gera uma senha temporária, força a troca no próximo login e grava uma cópia em `data/admin-initial-credentials.json` (pasta ignorada pelo Git). Apague o arquivo após guardar a senha com segurança.

As variáveis locais podem ser carregadas temporariamente de um `.env` local; não o envie ao Git. `.env.example` contém apenas nomes e valores fictícios.

## Executar localmente

```powershell
npm.cmd ci
npm.cmd start
```

Abra `http://localhost:3000`. O login do painel fica em `/admin`.

## Uploads de imagem

O painel aceita apenas JPG, PNG e WebP até 2 MB. A validação ocorre no navegador, na função server-side (incluindo assinatura binária real do arquivo) e no limite do bucket Storage. O bucket permanece privado; a função `/media/*` entrega as imagens e a chave secreta nunca chega ao cliente.

## Habilidades do agente

As skills oficiais `supabase` e `supabase-postgres-best-practices` estão instaladas no ambiente Codex do usuário. O repositório versiona o projeto Supabase em `supabase/` e suas migrações.
