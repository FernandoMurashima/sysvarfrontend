export interface Tributo {
  id?: number;
  empresa?: number;
  codigo: string;
  descricao: string;
  esfera: 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL' | string;
  atual: boolean;
  ativo: boolean;
  observacoes?: string | null;
}
