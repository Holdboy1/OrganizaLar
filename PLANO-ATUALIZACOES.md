# Plano de atualizacoes - OrganizaLar

Este arquivo e a lista viva do que vamos consolidar antes de migrar para app nativo.

Regra principal: manter o design atual. A evolucao deve melhorar funcionamento, confianca e automacao sem redesenhar a interface.

## Prioridade 1 - Motor de comandos por voz

Objetivo: falar naturalmente e o sistema jogar no lugar certo.

- [feito] Separar o interpretador de voz em um motor de comandos estruturado.
- [feito] Retornar sempre: acoes, confianca, avisos e campos que precisam de revisao.
- Suportar despesas, receitas, mercado, mercadinho, cartao, fatura, despensa e consultas.
- [feito] Entender frases com varias acoes: "gastei 80 no Atacadao e 99 de internet".
- Entender correcao manual e aprender apelidos locais: "mercadinho do Ze", "Atacadao", "conta de luz".
- Manter revisao antes de salvar quando a confianca nao for alta.
- [feito] Criar bateria inicial de testes com frases reais do uso diario.

## Prioridade 2 - Cupom fiscal, QR Code e SEFAZ-PE

Objetivo: ler cupom fiscal e puxar os dados oficiais do mercado quando possivel.

- Usar QR Code/chave de acesso como caminho principal.
- Consultar NFC-e/SEFAZ-PE quando o cupom permitir.
- Identificar CNPJ, mercado, data, valor total e itens.
- Cadastrar/atualizar estabelecimento pelo CNPJ.
- Criar compra em Mercado ou Mercadinho automaticamente.
- Vincular itens do cupom ao catalogo da despensa.
- Atualizar preco medio, ultimo preco e ultima compra dos itens.
- Usar OCR apenas como fallback quando QR Code/SEFAZ falhar.
- Detectar cupom duplicado pela chave de acesso.
- Exigir conferencia rapida antes de salvar quando houver baixa confianca.

## Prioridade 3 - Despensa inteligente

Objetivo: a compra alimentar a despensa sem retrabalho.

- Transformar itens de cupom em itens de catalogo.
- Somar estoque automaticamente quando uma compra for salva.
- Permitir corrigir unidade, nome e categoria do item.
- Aprender equivalencias: "arroz branco 1kg" = "arroz".
- Calcular consumo medio por item.
- Gerar lista sugerida por estoque baixo e consumo.
- Evitar sugestoes ruins quando a confianca dos dados for baixa.

## Prioridade 4 - Backup e seguranca local

Objetivo: nao perder dados e proteger o app pessoal.

- Botao claro de exportar backup.
- Botao claro de importar backup.
- Lembrete de backup quando passar muitos dias.
- PIN real em vez de PIN mock.
- Bloqueio local simples para PWA.
- Preparar caminho para criptografia local no app nativo.

## Prioridade 5 - Cartoes e faturas

Objetivo: cartao nao virar bagunca.

- Melhorar vinculo de compras de mercado no credito com a fatura.
- Registrar pagamento de fatura com rastreio claro.
- Evitar duplicidade entre compra de mercado e compra de cartao.
- Melhorar importacao de faturas quando o usuario colar texto.
- Detectar banco/cartao pelo texto quando possivel.

## Prioridade 6 - Qualidade interna

Objetivo: mexer sem quebrar.

- [feito] Criar testes internos do dominio de voz.
- Criar testes internos do parser de cupom.
- Criar testes internos de compra de mercado + despensa.
- Rodar TypeScript antes do build quando a mudanca tocar regras.
- Rodar `npm run build` apos toda atualizacao.
- [feito] Remover codigo experimental que dependa de API externa para transcricao, ja que o caminho desejado e local/caseiro.

## Prioridade 7 - Preparacao para app nativo

Objetivo: migrar somente depois que o cerebro do sistema estiver bom.

- Deixar motor de comandos independente de PWA/React.
- Deixar parser de cupom independente da tela.
- Deixar regras de despensa independentes da tela.
- Avaliar Expo/React Native para Android.
- Usar reconhecimento de voz nativo do Android sem backend proprio.
- Manter PWA como versao web leve.

## Ordem pratica de ataque

1. Motor de comandos por voz.
2. Testes de frases reais.
3. Cupom fiscal por QR Code/chave.
4. Integracao SEFAZ-PE quando viavel.
5. Fallback OCR.
6. Despensa alimentada por cupom.
7. Backup/importacao/PIN real.
8. Preparacao do app nativo.

## Criterio de pronto

Uma atualizacao so entra como pronta quando:

- Nao muda o design sem necessidade.
- Passa nos testes internos definidos para aquela parte.
- Passa no TypeScript quando aplicavel.
- Passa em `npm run build`.
- Gera uma versao nova em `out/` para subir no Netlify.
