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
  deve_trocar_senha?: boolean;
  Idloja?: number | null;
  loja_id?: number | null;
  loja?: { Idloja: number; empresa?: number | null; nome_loja?: string; apelido_loja?: string } | null;
  Idlojas?: number[];
  lojas?: Array<{ Idloja: number; empresa?: number | null; nome_loja?: string; apelido_loja?: string }>;
  permissoes_modulos?: Array<{ modulo: string; acesso: 'HERDAR' | 'NONE' | 'VIEW' | 'EDIT' }>;
  permissoes_campos?: Array<{ campo: string; pode_ver: boolean }>;
  perfil_principal?: { id: number; nome: string; descricao?: string; ativo: boolean; padrao?: boolean } | null;
  perfil_principal_id?: number | null;
  is_platform_superuser?: boolean;
  is_company_master?: boolean;
  is_full_company_administrator?: boolean;
  contrato?: {
    status: string;
    limite_usuarios: number;
    limite_sessoes_simultaneas: number;
    usuarios_ativos: number;
    sessoes_ativas: number;
    licencas_disponiveis: number;
    sessoes_disponiveis: number;
    excedido: boolean;
    limite_excedido: boolean;
    plano_completo: boolean;
    permissions_version: number;
  } | null;
  sessao_atual?: { session_id: string; dispositivo_id: string; iniciada_em: string; ultima_atividade_em: string } | null;
  modulos_disponiveis_empresa?: string[];
  permissoes_efetivas?: Record<string, 'NONE' | 'VIEW' | 'EDIT'>;
  password?: string; // write-only no backend; só enviar em criação/alteração de senha
}
