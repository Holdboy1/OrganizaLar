// Tipos centrais do OrganizaLar

export type FormaPagamento = 'dinheiro' | 'debito' | 'credito' | 'pix';
export type StatusDespesa = 'paga' | 'pendente' | 'vencida';
export type TipoMercado = 'mercado' | 'mercadinho';
export type StatusFatura = 'aberta' | 'fechada' | 'paga' | 'paga_parcial';
export type Confianca = 'alta' | 'media' | 'baixa' | 'nenhuma';

export interface Categoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  tipo?: 'receita' | 'despesa';
  protegida?: boolean;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  paga: boolean;
  pagaEm?: string | null;
  obs?: string;
  recorrenteId?: string | null;
  pagamentoFaturaId?: string | null;
  criadoEm: string;
}

export interface Receita {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  recebida: boolean;
  recebidaEm?: string | null;
  obs?: string;
  recorrenteId?: string | null;
  criadoEm: string;
}

export interface Recorrente {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  diaVencimento: number;
  inicio: string;
  fim?: string | null;
  ativa: boolean;
  criadoEm: string;
}

export interface ReceitaRecorrente {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  diaRecebimento: number;
  inicio: string;
  fim?: string | null;
  ativa: boolean;
  criadoEm: string;
}

export interface Cartao {
  id: string;
  nome: string;
  banco: 'nubank' | 'mercado_pago' | 'picpay' | 'outro';
  bandeira?: string | null;
  ultimosDigitos?: string | null;
  diaFechamento: number;
  diaVencimento: number;
  limite?: number | null;
  cor: string;
  icone: string;
  ativo: boolean;
  criadoEm: string;
}

export interface CompraCartao {
  id: string;
  cartaoId: string;
  data: string;
  descricao: string;
  valorTotal: number;
  parcelas: number;
  categoria: string;
  obs?: string;
  origem: 'manual' | 'import_texto' | 'import_csv' | 'import_pdf' | 'mercado';
  importLoteId?: string | null;
  origemMercadoId?: string | null;
  criadoEm: string;
}

export interface PagamentoFatura {
  id: string;
  cartaoId: string;
  faturaRef: string;
  dataPagamento: string;
  valorPago: number;
  valorTotalFatura: number;
  saldoTransferido: number;
  obs?: string;
  criadoEm: string;
}

export interface Estabelecimento {
  id: string;
  nome: string;
  tipo: TipoMercado;
  cnpj?: string | null;
  cor: string;
  icone: string;
  formaPagamentoPadrao?: FormaPagamento | null;
  cartaoPadraoId?: string | null;
  obs?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface CompraMercado {
  id: string;
  tipo: TipoMercado;
  estabelecimentoId?: string | null;
  data: string;
  valor: number;
  formaPagamento: FormaPagamento;
  cartaoId?: string | null;
  compraCartaoId?: string | null;
  obs?: string;
  origem: 'manual' | 'qrcode' | 'voz';
  chaveAcesso?: string | null;
  cnpjEmitente?: string | null;
  criadoEm: string;
}

export interface ItemCatalogo {
  id: string;
  nome: string;
  nomeNormalizado: string;
  ean?: string | null;
  unidade: string;
  qtdEmbalagem?: number | null;
  categoriaProduto: string;
  tipo: 'estocavel' | 'perecivel' | 'base';
  itemBase: boolean;
  estoqueMinimo?: number | null;
  estoqueMaximoHistorico: number;
  consumoMedioDiario: number;
  consumoConfianca: Confianca;
  ultimoPreco?: number | null;
  precoMedio?: number | null;
  ultimaCompra?: string | null;
  criadoEm: string;
}

export interface ItemCompra {
  id: string;
  compraMercadoId: string;
  itemId: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  origem: 'manual' | 'sefaz' | 'ocr';
  criadoEm: string;
}

export interface EstoqueItem {
  quantidade: number;
  atualizadoEm: string;
}

export interface Conferencia {
  id: string;
  data: string;
  itens: Array<{
    itemId: string;
    anterior: number;
    novo: number;
    consumido: number;
  }>;
  criadaEm: string;
}

export interface ListaSugerida {
  id: string;
  criadaEm: string;
  itens: Array<{
    itemId: string;
    itemNome: string;
    unidade: string;
    categoriaProduto: string;
    quantidadeSugerida: number;
    estoqueAtual: number;
    consumoMedioDiario: number;
    confianca: Confianca;
    valorEstimado: number;
    justificativa: string;
    incluido: boolean;
  }>;
  totalEstimado: number;
  economiaEstimada: number;
  itensEvitados: Array<{
    itemId: string;
    nome: string;
    valorEvitado: number;
  }>;
  status: 'rascunho' | 'executada';
  comprasVinculadas?: string[];
}

export interface RegraCategorizacao {
  id: string;
  padrao: string;
  categoriaId: string;
  vezesAplicada: number;
  ultimaAplicacao: string;
  origem: 'automatica' | 'manual';
}

export interface RegistroLixeira {
  id: string;
  tipo: string;
  registro: any;
  removidoEm: string;
}

export interface Preferencias {
  modoVisualizacaoPainel: 'consolidada' | 'separada';
  mostrarCartaoNoPainel: boolean;
}

export interface ConfigDespensa {
  horizonteDias: number;
  janelaConsumoDias: number;
  assistenteCompletado?: boolean;
}

export interface ConfigGeral {
  lembrarBackupDias: number;
  alertaGastoAnormalPct: number;
  alertaReajustePct: number;
}

export interface AppState {
  versao: number;
  categorias: Categoria[];
  despesas: Despesa[];
  receitas: Receita[];
  recorrentes: Recorrente[];
  receitasRecorrentes: ReceitaRecorrente[];
  ultimaGeracao: string | null;
  cartoes: Cartao[];
  comprasCartao: CompraCartao[];
  pagamentosFatura: PagamentoFatura[];
  regrasCategorizacao: RegraCategorizacao[];
  preferencias: Preferencias;
  estabelecimentos: Estabelecimento[];
  comprasMercado: CompraMercado[];
  itensCatalogo: ItemCatalogo[];
  itensCompra: ItemCompra[];
  estoque: Record<string, EstoqueItem>;
  conferencias: Conferencia[];
  listasSugeridas: ListaSugerida[];
  configDespensa: ConfigDespensa;
  lixeira: RegistroLixeira[];
  ultimoBackup: string | null;
  config: ConfigGeral;
}

// Resultado da interpretação de voz
export interface VozInterpretacao {
  tipo: 'despesa' | 'receita' | 'mercado' | 'mercadinho' | null;
  valor: number | null;
  categoriaSugerida: string | null;
  descricao: string;
  formaPagamento?: FormaPagamento | null;
  data?: string;
  estabelecimentoSugerido?: string | null;
  textoOriginal: string;
  acoes?: VozAcao[]; // múltiplas ações detectadas
}

export interface VozAcao {
  tipo: 'despesa' | 'receita' | 'mercado' | 'mercadinho';
  valor: number;
  descricao: string;
  categoriaSugerida?: string;
  formaPagamento?: FormaPagamento;
  estabelecimento?: string;
}
