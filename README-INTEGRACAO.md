# OrganizaLar — Integração concluída

App **Next.js + React + Tailwind + shadcn/ui** com toda a lógica do OrganizaLar conectada ao novo design premium.

## O que foi implementado

### ✅ Infraestrutura
- **Zustand** para state management global com persistência em localStorage
- Tipos TypeScript completos (`lib/types/`)
- Lógica de domínio (`lib/domain/`): cartões, mercado, despensa, voz, analytics, helpers
- Hook customizado `useVoice` com suporte completo (visualização de áudio, erros amigáveis)

### ✅ Botão flutuante de voz (FAB)
**Aparece em todas as telas**, no canto inferior direito.

Recursos:
- **Detecta múltiplas ações em uma frase**: "gastei 80 reais no Atacadão e 99 reais de internet" → cria 2 lançamentos
- **Visualizador de áudio em tempo real** (barra que sobe e desce com o volume)
- **Texto parcial** sendo exibido enquanto você fala
- **Mensagens de erro amigáveis** específicas para cada problema (permissão, internet, sem mic, etc.)
- **Modo digitar** como fallback (aceita o mesmo texto que seria falado)
- **Tela de revisão obrigatória** com edição inline antes de salvar
- **Cards coloridos por tipo** (despesa rosa, receita verde, mercado âmbar, mercadinho laranja)
- **Cria estabelecimentos automaticamente** quando você fala sobre um mercado novo
- **Categorização inteligente** baseada em palavras-chave

### ✅ Telas conectadas ao store
- **Dashboard**: totais reais, gráfico anual, top 5, alertas de vencimento, previsão de fatura
- **Despesas/Receitas/Recorrentes**: listagem real com filtros, edição completa
- **Mercado/Mercadinho**: atalhos por estabelecimento, lista de compras com edição
- **Despensa**: catálogo de itens, controle de estoque com +/-, agrupamento por categoria
- **Cartões**: cards visuais com gradiente, faturas calculadas em tempo real

### ✅ Modais com edição
- Despesa (criar/editar)
- Receita (criar/editar)
- Compra de Mercado (com vínculo automático a cartão se crédito)
- Cartão (com presets de banco)
- Item da Despensa

### 🟡 Não implementado (deixei pra evolução)
- Tela "Mais" ainda usa mock — fácil de conectar
- Lock screen ainda usa PIN mock "1234"
- Importação de fatura (parsers Nubank/MP/PicPay)
- Scanner QR Code
- OCR de cupom
- Comparativo mensal detalhado
- Lista de compras sugerida pela despensa
- Conferência de despensa

Tudo isso está com a **lógica pronta** no `_entrega/` original — basta portar.

## Como rodar

```bash
cd redesign-organiza-lar-app
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Como usar a voz

1. Clique no botão verde flutuante no canto inferior direito (🎤)
2. Permita acesso ao microfone (uma vez só)
3. Fale a frase: "Gastei 50 reais na padaria"
4. O app extrai os dados e mostra um card editável
5. Confira/ajuste e clique em **Salvar**

Funciona com **múltiplas ações**:
- "Gastei 50 na padaria e 100 de luz e 80 no mercado Atacadão"
→ cria 3 lançamentos separados

## Próximos passos sugeridos

1. **Trocar PIN mock** por sistema real (use `lib/domain/seguranca.ts` do projeto antigo)
2. **Conectar tela "Mais"** (export, import, configurações)
3. **Portar scanner QR Code** (use `scanner.js` do projeto antigo)
4. **Lista sugerida de compras** (lógica em `lib/domain/`)
5. **Notificações push**

## Estrutura de arquivos

```
redesign-organiza-lar-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              ← App principal com FAB integrado
│   └── globals.css
├── components/
│   ├── voice/
│   │   └── voice-fab.tsx     ← BOTÃO FLUTUANTE DE VOZ
│   ├── modals/
│   │   ├── despesa-modal.tsx
│   │   ├── receita-modal.tsx
│   │   ├── compra-mercado-modal.tsx
│   │   └── cartao-modal.tsx
│   ├── ui/                   (shadcn)
│   ├── dashboard.tsx         ← Conectado ao store
│   ├── despesas.tsx          ← Conectado ao store
│   ├── mercado.tsx           ← Conectado ao store
│   ├── despensa.tsx          ← Conectado ao store
│   ├── cartoes.tsx           ← Conectado ao store
│   └── ...
├── hooks/
│   └── use-voice.ts          ← Hook de reconhecimento de voz
├── lib/
│   ├── store/
│   │   └── app-store.ts      ← Zustand store global
│   ├── domain/
│   │   ├── helpers.ts
│   │   ├── cartoes.ts
│   │   ├── mercado.ts
│   │   ├── analytics.ts
│   │   └── voz.ts            ← Interpretador de fala
│   └── types/
│       └── index.ts
└── package.json
```

## Persistência

Os dados ficam em `localStorage`, key: `organizalar-state-v5`.

Para resetar tudo durante teste:
```js
localStorage.removeItem('organizalar-state-v5')
location.reload()
```
