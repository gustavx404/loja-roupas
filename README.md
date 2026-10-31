# Cardápio Online · Sabor Brasileiro

Aplicação web para publicar o cardápio da lanchonete, receber pedidos em uma mensagem pronta do WhatsApp e editar produtos em um painel privado.

## Executar localmente

Requer Node.js 24 ou mais recente.

1. Instale as dependências do projeto:

   ```sh
   npm install
   ```

2. Inicie a aplicação local Netlify, que também sobe o banco Postgres de desenvolvimento:

   ```sh
   npm run dev
   ```

3. Em outro terminal, crie a única conta administrativa enquanto `netlify dev` estiver rodando:

   ```sh
   npm run admin:create
   ```

   A senha é digitada sem aparecer na tela. O cadastro não existe no site. Para provisionar sem terminal interativo, o comando aceita `ADMIN_CREDENTIALS_FILE=/caminho/seguro/credenciais.json npm run admin:create`, com JSON no formato `{"username":"admin","password":"uma-senha-longa"}`. Proteja esse arquivo e remova-o depois de criar a conta.

   Depois abra `http://127.0.0.1:3000` para ver o cardápio ou `http://127.0.0.1:3000/admin` para entrar no painel. A senha inicial exige troca no primeiro acesso.

O cardápio começa vazio. No painel, cadastre categorias e produtos, configure o número do WhatsApp com DDI e DDD e informe os horários.

O cardápio pode ser instalado como PWA pelo navegador. Em iPhone/iPad, abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Depois da primeira visita online, a tela do cardápio e os últimos dados carregados ficam disponíveis sem conexão; enviar pedidos pelo WhatsApp e usar o painel exige internet.

## Dados e publicação

O banco de desenvolvimento é Postgres iniciado pelo Netlify CLI. No deploy, o mesmo código usa Netlify Database. As fotos usam Netlify Blobs.

Para redefinir a senha administrativa local, com `npm run dev` ativo, execute `npm run admin:reset`. O comando invalida as sessões e mostra uma senha temporária nova, que deverá ser trocada no próximo acesso.

Para publicar, conecte o projeto a um site Netlify e habilite Netlify Database. O cookie administrativo usa `Secure` em URLs HTTPS.

O cliente escolhe os produtos e personalizações, informa o nome e abre o WhatsApp com o pedido preenchido. Ele revisa e envia a mensagem; pagamento, entrega e retirada são combinados diretamente com a lanchonete.
