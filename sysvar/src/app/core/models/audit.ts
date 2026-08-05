export type AuditCategory =
  | 'SECURITY' | 'ACCESS' | 'CONTRACT' | 'USER_MANAGEMENT' | 'CADASTRO'
  | 'PRODUCT' | 'PURCHASE' | 'STOCK' | 'SALE' | 'FISCAL' | 'FINANCIAL'
  | 'ACCOUNTING' | 'PRODUCTION' | 'DISTRIBUTION' | 'REPORT' | 'SYSTEM'
  | 'INTEGRATION';

export type AuditResult = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'PENDING' | 'ROLLED_BACK';
export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditOrigin = 'API' | 'WEB' | 'PDV' | 'OFFLINE_SYNC' | 'COMMAND' | 'IMPORT' | 'INTEGRATION' | 'SYSTEM';

export interface AuditLogListItem {
  id: number;
  event_id: string;
  created_at: string;
  user_username: string | null;
  empresa_nome: string | null;
  loja_nome: string | null;
  category: AuditCategory;
  action: string;
  result: AuditResult;
  severity: AuditSeverity;
  entidade: string;
  object_id: string | null;
  object_repr: string | null;
  ip: string | null;
  request_id: string | null;
}

export interface AuditLogDetail extends AuditLogListItem {
  correlation_id: string | null;
  empresa: number | null;
  empresa_id_snapshot: string | null;
  empresa_nome_snapshot: string | null;
  loja: number | null;
  loja_id_snapshot: string | null;
  loja_nome_snapshot: string | null;
  user: number | null;
  user_id_snapshot: string | null;
  username_snapshot: string | null;
  user_nome_snapshot: string | null;
  session_id: string | null;
  device_id: string | null;
  origin: AuditOrigin;
  app_label: string;
  model: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  metadata: Record<string, unknown> | null;
  user_agent: string | null;
  http_method: string | null;
  endpoint: string | null;
  status_code: number | null;
  error_code: string | null;
  error_message: string | null;
}

export interface AuditIndicators {
  total: number;
  success: number;
  failure: number;
  denied: number;
  critical: number;
}

export interface AuditFilters {
  created_at_after?: string;
  created_at_before?: string;
  empresa?: string | number;
  loja?: string | number;
  user?: string | number;
  category?: AuditCategory | '';
  action?: string;
  result?: AuditResult | '';
  severity?: AuditSeverity | '';
  origin?: AuditOrigin | '';
  app_label?: string;
  model?: string;
  object_id?: string;
  request_id?: string;
  correlation_id?: string;
  session_id?: string;
  device_id?: string;
  ip?: string;
  http_method?: string;
  endpoint?: string;
  status_code?: string | number;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedAuditLogs {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLogListItem[];
}
