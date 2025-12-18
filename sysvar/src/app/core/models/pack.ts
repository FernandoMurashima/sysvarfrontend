export interface PackModel {
  id?: number;               // PK padrão DRF
  nome?: string | null;
  grade: number;             // FK -> Grade (ID)
  ativo?: boolean;
  data_cadastro?: string;    // ISO
  atualizado_em?: string;    // ISO
}

export type CreatePackDto = Omit<PackModel, 'id' | 'data_cadastro' | 'atualizado_em'>;
export type UpdatePackDto = Partial<CreatePackDto>;
