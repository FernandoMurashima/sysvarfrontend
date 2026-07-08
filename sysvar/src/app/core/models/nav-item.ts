// src/app/core/models/nav-item.ts
export type UserRole =
  | 'Regular'
  | 'Vendedor'
  | 'Caixa'
  | 'Gerente'
  | 'Diretor'
  | 'Admin'
  | 'Auxiliar'
  | 'Assistente'
  | 'AssistenteReceber'
  | 'AssistentePagar';

export interface NavItem {
  label: string;
  icon?: string;
  link?: string;        // rota direta
  children?: NavItem[]; // submenus
  roles?: UserRole[];   // <- agora usando o tipo exportado
  superOnly?: boolean;
}
