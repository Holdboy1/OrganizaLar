# Deploy Netlify — atualização

## ✅ Corrigido nesta versão

1. **Erro "This page couldn't load"** ao clicar em opções — adicionado `_redirects` que faz qualquer URL voltar pro app (SPA routing)
2. **Não conseguia instalar PWA no celular** — agora tem:
   - `manifest.json` configurado com ícones, cores e nome
   - Service Worker (`sw.js`) que registra automaticamente
   - Banner pra instalar quando suportado
3. **Service Worker antigo continuava ativo** — o novo SW limpa caches antigos automaticamente
4. **Bug de useState no Despensa** — corrigido para useEffect
5. **Erro pages global** — adicionado fallback amigável (`error.tsx`)

## Como atualizar o site agora

### Caminho rápido (drag & drop)

1. Abre https://app.netlify.com
2. Vai no site `organizalar` → **Deploys**
3. **Arrasta a pasta `out/`** para a área de upload
   - Caminho: `C:\Users\holdboy\Downloads\OrganizaLar\redesign-organiza-lar-app\out`
   - ⚠️ **Apenas a pasta `out/`**, não a raiz do projeto
4. Aguarda ~30s

### Importante: limpar cache do navegador

Antes de testar, abra o site no navegador e:

**Desktop:**
1. F12 → **Application** → **Service Workers** → **Unregister**
2. **Storage** → **Clear site data**
3. F5 ou Ctrl+Shift+R

**Android (Chrome):**
1. Configurações do Chrome → Privacidade → Limpar dados de navegação
2. Selecione o domínio `organizalar.netlify.app`
3. Limpa cookies e cache
4. Reabre

Ou abre em **janela anônima** pra confirmar que tá funcionando antes de limpar.

## Como instalar como PWA no Android

Depois do deploy:

1. Abre `https://organizalar.netlify.app` no Chrome do Android
2. Aguarda 5 segundos — um banner verde aparecerá oferecendo "Instalar OrganizaLar"
3. Toca em **Instalar**

OU manualmente:
1. Toca no menu (⋮) do Chrome
2. **"Adicionar à tela inicial"** ou **"Instalar app"**

## Para deploys futuros

```bash
cd redesign-organiza-lar-app
npm run build
```

E sobe a pasta `out/` no Netlify novamente.

## Build automático com Git

Se quiser que cada `git push` faça deploy:

1. Sobe o projeto pro GitHub:
   ```bash
   cd redesign-organiza-lar-app
   git init
   git add .
   git commit -m "redesign premium"
   git branch -M main
   git remote add origin https://github.com/SEU-USER/organizalar.git
   git push -u origin main
   ```

2. No Netlify: **Site Settings → Build & Deploy → Link to Git**
   - Escolhe o repo
   - Configurações já estão no `netlify.toml`
