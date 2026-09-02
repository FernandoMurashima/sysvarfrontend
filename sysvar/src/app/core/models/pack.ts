export interface PackModel {
  id?: number;               // PK padrão DRF
  nome?: string | null;
  grade: number;             // FK -> Grade (ID)
  ativo?: boolean;
  bloqueado_alteracao?: boolean;
  data_cadastro?: string;    // ISO
  atualizado_em?: string;    // ISO
}

export type CreatePackDto = Omit<PackModel, 'id' | 'bloqueado_alteracao' | 'data_cadastro' | 'atualizado_em'>;
export type UpdatePackDto = Partial<CreatePackDto>;
