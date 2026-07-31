import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdemProducaoService } from '../../core/services/ordem-producao.service';

@Component({
  selector: 'app-producao-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './producao-home.component.html',
  styleUrls: ['./producao-home.component.css'],
})
export class ProducaoHomeComponent implements OnInit {
  private api = inject(OrdemProducaoService);

  loading = false;
  errorMsg = '';
  painel: any = null;
  modal: 'insumos' | 'faccao' | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly viewPrefsKey = 'sysvar.ui.preferences.producao';

  ngOnInit(): void {
    this.loadViewPreference();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.painel().subscribe({
      next: res => this.painel = res,
      error: () => this.errorMsg = 'Falha ao carregar o painel de produção.',
      complete: () => this.loading = false,
    });
  }

  money(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  qtd(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      ABERTA: 'Aberta',
      APROVADA: 'Aprovada',
      EM_PRODUCAO: 'Em produção',
      FINALIZADA: 'Finalizada',
      CANCELADA: 'Cancelada',
      PENDENTE: 'Pendente',
      ENVIADO: 'Enviado',
      RETORNADO: 'Retornado',
    };
    return labels[String(status || '')] || '-';
  }

  abrirModal(tipo: 'insumos' | 'faccao'): void {
    this.modal = tipo;
  }

  fecharModal(): void {
    this.modal = null;
  }

  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); this.indicatorsVisible = true; this.filtersVisible = true; this.saveViewPreference(); }
  @HostListener('window:sysvar-producao-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-producao-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-producao-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
    } catch {}
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible }));
  }
}
