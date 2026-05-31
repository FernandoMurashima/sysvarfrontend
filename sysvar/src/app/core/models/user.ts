export interface User {
  id?: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  type: 'Regular' | 'Vendedor' | 'Caixa' | 'Gerente' | 'Diretor' | 'Admin' | 'Auxiliar' | 'Assistente' | 'AssistenteReceber' | 'AssistentePagar';
  password?: string; // write-only no backend; só enviar em criação/alteração de senha
}
