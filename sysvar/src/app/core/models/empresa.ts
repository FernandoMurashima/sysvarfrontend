export interface Empresa {
  id?: number;
  nome: string;
  nome_fantasia?: string | null;
  documento?: string | null;
  ativo?: boolean;
  plano_completo?: boolean;
  licenca_master?: boolean;
  usa_vendas?: boolean;
  usa_compras?: boolean;
  usa_estoque?: boolean;
  usa_financeiro?: boolean;
  usa_fiscal?: boolean;
  usa_producao?: boolean;
  usa_ficha_tecnica?: boolean;
  usa_faccao?: boolean;
  usa_distribuicao_producao?: boolean;
  data_cadastro?: string;
}

export interface EmpresaContrato {
  id?: number;
  empresa: number;
  status: 'PENDENTE' | 'ATIVO' | 'SUSPENSO' | 'VENCIDO' | 'CANCELADO';
  data_inicio: string;
  data_fim?: string | null;
  limite_usuarios: number;
  plano_completo: boolean;
  usuario_master?: number | null;
  observacoes?: string;
  permissions_version?: number;
  usuarios_ativos?: number;
  licencas_disponiveis?: number;
  excedido?: boolean;
}

export interface ModuloSistema {
  id: number;
  chave: string;
  nome: string;
  descricao?: string;
  categoria: 'BASICO' | 'COMERCIAL' | 'INTERNO';
  basico: boolean;
  ativo: boolean;
  ordem: number;
  dependencias?: string[];
}

export interface EmpresaModulo {
  id?: number;
  empresa: number;
  modulo: number;
  modulo_chave?: string;
  modulo_nome?: string;
  contratado: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
}
