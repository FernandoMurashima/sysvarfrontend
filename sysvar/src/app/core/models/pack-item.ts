export interface PackItemModel {
  id?: number;             // PK padrão DRF
  pack: number;            // FK -> Pack (ID)
  tamanho: number;         // FK -> Tamanho (ID)
  qtd: number;             // >=1
}

export type CreatePackItemDto = Omit<PackItemModel, 'id'>;
export type UpdatePackItemDto = Partial<CreatePackItemDto>;
