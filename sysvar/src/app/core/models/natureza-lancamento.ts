export interface NatLancamento {
  idnatureza?: number;

  codigo: string;                 // max 10
  categoria_principal: string;    // max 50
  subcategoria: string;           // max 50
  descricao: string;              // max 255
  tipo: string;                   // max 20
  status: string;                 // max 10
  tipo_natureza: string;          // max 10
}
