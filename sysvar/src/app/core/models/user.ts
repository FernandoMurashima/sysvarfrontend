export interface User {
  id?: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  type: 'Regular' | 'Vendedor' | 'Caixa' | 'Gerente' | 'Diretor' | 'Admin' | 'Auxiliar' | 'Assistente' | 'AssistenteReceber' | 'AssistentePagar';
  Idempresa?: number | null;
  empresa?: { id: number; nome: string; nome_fantasia?: string | null } | null;
  is_staff?: boolean;
  is_superuser?: boolean;
  Idloja?: number | null;
  loja_id?: number | null;
  loja?: { Idloja: number; empresa?: number | null; nome_loja?: string; apelido_loja?: string } | null;
  Idlojas?: number[];
  lojas?: Array<{ Idloja: number; empresa?: number | null; nome_loja?: string; apelido_loja?: string }>;
  permissoes_modulos?: Array<{ modulo: string; acesso: 'NONE' | 'VIEW' | 'EDIT' }>;
  permissoes_campos?: Array<{ campo: string; pode_ver: boolean }>;
  password?: string; // write-only no backend; só enviar em criação/alteração de senha
}
