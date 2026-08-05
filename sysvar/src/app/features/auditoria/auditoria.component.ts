import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditCategory, AuditFilters, AuditIndicators, AuditLogDetail, AuditLogListItem, AuditResult, AuditSeverity } from '../../core/models/audit';
import { AuditService } from '../../core/services/audit.service';
import { AuthService } from '../../core/auth.service';

type DiffRow = { campo: string; antes: string; depois: string };

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.css'],
})
export class AuditoriaComponent implements OnInit {
  private api = inject(AuditService);
  private auth = inject(AuthService);

  loading = false;
  detailLoading = false;
  errorMsg = '';
  emptyMsg = '';
  selected: AuditLogListItem | null = null;
  detail: AuditLogDetail | null = null;
  indicatorsVisible = true;
  filtersVisible = true;

  rows: AuditLogListItem[] = [];
  total = 0;
  page = 1;
  pageSize = 25;
  ordering = '-created_at';
  indicators: AuditIndicators = { total: 0, success: 0, failure: 0, denied: 0, critical: 0 };

  filters: AuditFilters = {
    created_at_after: '',
    created_at_before: '',
    empresa: '',
    loja: '',
    user: '',
    category: '',
    action: '',
    result: '',
    severity: '',
    app_label: '',
    model: '',
    object_id: '',
    ip: '',
    request_id: '',
    search: '',
  };

  categories: AuditCategory[] = ['SECURITY', 'ACCESS', 'CONTRACT', 'USER_MANAGEMENT', 'CADASTRO', 'PRODUCT', 'PURCHASE', 'STOCK', 'SALE', 'FISCAL', 'FINANCIAL', 'ACCOUNTING', 'PRODUCTION', 'DISTRIBUTION', 'REPORT', 'SYSTEM', 'INTEGRATION'];
  results: AuditResult[] = ['SUCCESS', 'FAILURE', 'DENIED', 'PENDING', 'ROLLED_BACK'];
  severities: AuditSeverity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

  get isSuperUsuario(): boolean {
    return this.auth.getCurrentUser()?.is_superuser === true;
  }

  get canExport(): boolean {
    const user = this.auth.getCurrentUser();
    return user?.is_superuser === true || user?.is_company_master === true || this.auth.podeAcessarModulo('auditoria', true) === true;
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    const params = this.queryParams();
    this.api.list(params).subscribe({
      next: (res) => {
        this.rows = res.results || [];
        this.total = res.count || 0;
        this.emptyMsg = this.rows.length ? '' : 'Nenhum evento encontrado.';
      },
      error: (err) => {
        this.errorMsg = err?.status === 403 ? 'Sem permissão para consultar auditoria.' : 'Falha ao carregar auditoria.';
        this.rows = [];
        this.total = 0;
      },
      complete: () => this.loading = false,
    });
    this.api.getIndicators(params).subscribe({
      next: (data) => this.indicators = data,
      error: () => this.indicators = { total: 0, success: 0, failure: 0, denied: 0, critical: 0 },
    });
  }

  select(row: AuditLogListItem): void {
    this.selected = row;
    this.detailLoading = true;
    this.detail = null;
    this.api.get(row.id).subscribe({
      next: (data) => this.detail = data,
      error: () => this.errorMsg = 'Falha ao carregar detalhe do evento.',
      complete: () => this.detailLoading = false,
    });
  }

  closeDetail(): void {
    this.selected = null;
    this.detail = null;
  }

  consultar(): void {
    this.page = 1;
    this.load();
  }

  limpar(): void {
    this.filters = {
      created_at_after: '', created_at_before: '', empresa: '', loja: '', user: '',
      category: '', action: '', result: '', severity: '', app_label: '', model: '',
      object_id: '', ip: '', request_id: '', search: '',
    };
    this.page = 1;
    this.load();
  }

  exportar(): void {
    if (!this.canExport) return;
    this.api.exportCsv(this.queryParams()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'auditoria.csv';
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.errorMsg = 'Falha ao exportar CSV.',
    });
  }

  ordenar(campo: string): void {
    this.ordering = this.ordering === campo ? `-${campo}` : campo;
    this.load();
  }

  firstPage(): void { this.page = 1; this.load(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.load(); } }
  lastPage(): void { this.page = this.totalPages; this.load(); }
  pageSizeChanged(): void { this.page = 1; this.load(); }

  diffRows(detail: AuditLogDetail | null): DiffRow[] {
    if (!detail) return [];
    const before = detail.before_data || {};
    const after = detail.after_data || {};
    const fields = detail.changed_fields?.length ? detail.changed_fields : Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    return fields.map(campo => ({
      campo,
      antes: this.stringify(before[campo]),
      depois: this.stringify(after[campo]),
    }));
  }

  stringify(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  label(value: string | null | undefined): string {
    return value ? value.replace(/_/g, ' ') : '-';
  }

  private queryParams(): AuditFilters {
    const params: AuditFilters = { ...this.filters, page: this.page, page_size: this.pageSize, ordering: this.ordering };
    if (!this.isSuperUsuario) delete params.empresa;
    return params;
  }

  @HostListener('window:sysvar-auditoria-toggle-indicators') onToggleIndicatorsEvent(): void { this.indicatorsVisible = !this.indicatorsVisible; }
  @HostListener('window:sysvar-auditoria-toggle-filters') onToggleFiltersEvent(): void { this.filtersVisible = !this.filtersVisible; }
  @HostListener('window:sysvar-auditoria-restore-view') onRestoreViewEvent(): void { this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 25; this.limpar(); }
}
