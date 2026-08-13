// src/app/layout/shell/shell.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { NavItem } from '../../core/models/nav-item';
import { NavItemComponent } from '../../shared/nav-item/nav-item.component';
import { PermissionService } from '../../core/permission.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, NavItemComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css']
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private perm = inject(PermissionService);

  sidebarOpen = true;

  private cadastrosRoles: NavItem['roles'] = ['Diretor', 'Gerente'];
  private clientesRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'Caixa', 'Vendedor', 'AssistenteReceber'];
  private produtosRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'Auxiliar'];
  private estoqueConsultaRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'];
  private estoqueOperacaoRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'Auxiliar'];
  private pdvRoles: NavItem['roles'] = ['Caixa', 'Gerente'];
  private vendasGestaoRoles: NavItem['roles'] = ['Diretor', 'Gerente'];
  private comprasRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'AssistentePagar'];
  private receberRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'AssistenteReceber'];
  private pagarRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'AssistentePagar'];
  private caixaRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'Caixa'];
  private financeiroRoles: NavItem['roles'] = ['Diretor', 'Gerente', 'AssistenteReceber', 'AssistentePagar'];

  menuItems: NavItem[] = [
    { label: 'Home', link: '/home', icon: 'bi bi-house' },

    {
      label: 'Operacional', icon: 'bi bi-building-gear', moduloEmpresa: 'operacional',
      children: [
        { label: 'Empresas', link: '/empresas', icon: 'bi bi-buildings', moduloEmpresa: 'operacional' },
        { label: 'Estabelecimento', link: '/lojas', icon: 'bi bi-shop', moduloEmpresa: 'operacional' },
        { label: 'Usuários', link: '/config/usuarios', icon: 'bi bi-person-gear', moduloEmpresa: 'operacional' },
        { label: 'Perfis de acesso', link: '/config/perfis', icon: 'bi bi-shield-lock', moduloEmpresa: 'operacional' },
        { label: 'Auditoria', link: '/config/auditoria', icon: 'bi bi-clipboard-pulse', moduloEmpresa: 'auditoria' },
      ]
    },

    {
      label: 'Cadastros', icon: 'bi bi-journal-text', roles: this.cadastrosRoles, moduloEmpresa: 'cadastros',
      children: [
        { label: 'Clientes',            link: '/clientes',      icon: 'bi bi-people',        roles: this.clientesRoles, moduloEmpresa: 'cadastros' },
        { label: 'Fornecedores',        link: '/fornecedores',  icon: 'bi bi-truck',         roles: this.comprasRoles, moduloEmpresa: 'cadastros' },
        { label: 'Funcionários',        link: '/funcionarios',  icon: 'bi bi-person-badge',  roles: this.cadastrosRoles, moduloEmpresa: 'cadastros' },
      ]
    },

    {
      label: 'Produtos', icon: 'bi bi-box-seam', roles: this.produtosRoles, moduloEmpresa: 'produtos',
      children: [
        { label: 'Produto Venda'       ,   link: '/produtos',      icon: 'bi bi-box',           roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Produtos Uso/consumo',   link: '/produtos-uso',  icon: 'bi bi-box',           roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Grupos',                 link: '/grupos',        icon: 'bi bi-diagram-2',     roles: this.produtosRoles, moduloEmpresa: 'produtos' },        
        { label: 'Cores',                  link: '/cores',         icon: 'bi bi-palette',       roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Grades',                 link: '/grades',        icon: 'bi bi-grid',          roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Coleções',               link: '/colecoes',      icon: 'bi bi-layers',        roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Pack'    ,               link: '/packs'    ,     icon: 'bi bi-bounding-box',  roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Unidades',               link: '/unidades',      icon: 'bi bi-rulers',        roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Tabela de Preço',         link: '/vendas/tabelas', icon: 'bi bi-tags',         roles: this.vendasGestaoRoles, moduloEmpresa: 'produtos' },
        { label: 'Material',                link: '/material',       icon: 'bi bi-box2',         roles: this.produtosRoles, moduloEmpresa: 'produtos' },
      ]
    },

    {
      label: 'Compras', icon: 'bi bi-receipt', roles: this.comprasRoles, moduloEmpresa: 'compras',
      children: [
        { label: 'Pedido de Compra Revenda', link: '/compras/pedidos-revenda', icon: 'bi bi-bag-check', roles: this.comprasRoles, moduloEmpresa: 'compras' },
        { label: 'Pedido de Compra Uso/Consumo', link: '/compras/pedidos-uso-consumo', icon: 'bi bi-bag-check', roles: this.comprasRoles, moduloEmpresa: 'compras' },
        { label: 'Entrada de NF-e', link: '/compras/notas-entrada', icon: 'bi bi-receipt', roles: this.comprasRoles, moduloEmpresa: 'compras' },
        { label: 'Notas Lançadas', link: '/compras/notas-entrada', icon: 'bi bi-receipt-cutoff', roles: this.comprasRoles, moduloEmpresa: 'compras' },
      ]
    },

    {
      label: 'Estoque', icon: 'bi bi-archive', roles: this.estoqueConsultaRoles, moduloEmpresa: 'estoque',
      children: [
        {
          label: 'Consultas', icon: 'bi bi-search', roles: this.estoqueConsultaRoles, moduloEmpresa: 'estoque',
          children: [
            { label: 'Por Referência', link: '/estoque/consulta-referencia', icon: 'bi bi-dot', roles: this.estoqueConsultaRoles, moduloEmpresa: 'estoque' },
            { label: 'Movimentação por Referência', link: '/estoque/consulta-movimentacao-referencia', icon: 'bi bi-arrow-left-right', roles: this.estoqueConsultaRoles, moduloEmpresa: 'estoque' },
            { label: 'Consulta por Coleção/Estação', link: '/estoque/consulta-colest', icon: 'bi bi-columns-gap', roles: this.estoqueConsultaRoles, moduloEmpresa: 'estoque' },
          ]
        },
        { label: 'Movimentações', link: '/estoque/movimentacoes', icon: 'bi bi-arrow-left-right', roles: this.estoqueOperacaoRoles, moduloEmpresa: 'estoque' },
        { label: 'Inventário', link: '/estoque/inventario', icon: 'bi bi-clipboard-data', roles: this.estoqueOperacaoRoles, moduloEmpresa: 'estoque' },
        { label: 'Etiquetas', link: '/estoque/etiquetas', icon: 'bi bi-upc-scan', roles: this.estoqueOperacaoRoles, moduloEmpresa: 'estoque' },
        { label: 'Recebimento de Mercadorias', link: '/loja/recebimento', icon: 'bi bi-box-arrow-in-down', roles: this.caixaRoles, moduloEmpresa: 'estoque' },
      ]
    },

    {
      label: 'Distribuição', icon: 'bi bi-diagram-3', roles: this.estoqueOperacaoRoles, moduloEmpresa: 'distribuicao',
      children: [
        { label: 'Perfis e Distribuição', link: '/distribuicao', icon: 'bi bi-sliders', roles: this.estoqueOperacaoRoles, moduloEmpresa: 'distribuicao' },
        { label: 'Pedidos de Venda', link: '/distribuicao/pedidos-venda', icon: 'bi bi-receipt', roles: this.estoqueOperacaoRoles, moduloEmpresa: 'distribuicao' },
        { label: 'Faturamento', link: '/fiscal/faturamento', icon: 'bi bi-file-earmark-check', roles: this.vendasGestaoRoles, moduloEmpresa: 'distribuicao' },
      ]
    },

    {
      label: 'Produção', icon: 'bi bi-scissors', roles: ['Diretor', 'Gerente'], moduloEmpresa: 'producao',
      children: [
        { label: 'Painel de Produção', link: '/producao', icon: 'bi bi-grid-1x2', roles: ['Diretor', 'Gerente'], moduloEmpresa: 'producao' },
        { label: 'Ficha Técnica', link: '/producao/ficha-tecnica', icon: 'bi bi-list-check', roles: ['Diretor', 'Gerente'], moduloEmpresa: 'producao' },
        { label: 'Ordem de Produção', link: '/producao/ordens', icon: 'bi bi-clipboard-check', roles: ['Diretor', 'Gerente'], moduloEmpresa: 'producao' },
      ]
    },

    {
      label: 'Vendas', icon: 'bi bi-receipt', roles: ['Caixa', 'Gerente', 'Diretor', 'Vendedor'], moduloEmpresa: 'vendas',
      children: [
        { label: 'PDV'                  , link: '/vendas/pdv',        icon: 'bi bi-display',                roles: this.pdvRoles, moduloEmpresa: 'vendas' },
        { label: 'PDV Offline', link: '/loja/pdv-offline', icon: 'bi bi-pc-display', roles: this.pdvRoles, moduloEmpresa: 'vendas' },
        { label: 'Consulta de vendas'   , link: '/vendas/relatorios', icon: 'bi bi-bar-chart-line',         roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
        { label: 'Devoluções de vendas', link: '/loja/devolucoes', icon: 'bi bi-arrow-counterclockwise', roles: this.caixaRoles, moduloEmpresa: 'vendas' },
        { label: 'Cashback'             , link: '/vendas/cashback',   icon: 'bi bi-gift',                   roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
        { label: 'Vales-troca', link: '/financeiro/vales-troca', icon: 'bi bi-ticket-perforated', roles: ['Admin'], moduloEmpresa: 'vendas' },
        { label: 'Promoções'            , link: '/vendas/promocoes',  icon: 'bi bi-tags',                   roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
      ]
    },

    {
      label: 'Módulo Loja', icon: 'bi bi-shop-window', roles: ['Caixa', 'Gerente', 'Diretor', 'Vendedor'], moduloEmpresa: 'vendas',
      children: [
        { label: 'PDV Offline', link: '/loja/pdv-offline', icon: 'bi bi-pc-display', roles: this.pdvRoles, moduloEmpresa: 'vendas' },
        { label: 'Recebimento de Mercadorias', link: '/loja/recebimento', icon: 'bi bi-box-arrow-in-down', roles: this.caixaRoles, moduloEmpresa: 'estoque' },
        { label: 'Consulta de Vendas', link: '/vendas/relatorios', icon: 'bi bi-bar-chart-line', roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
        { label: 'Devoluções de Vendas', link: '/loja/devolucoes', icon: 'bi bi-arrow-counterclockwise', roles: this.caixaRoles, moduloEmpresa: 'vendas' },
        { label: 'Cashback', link: '/vendas/cashback', icon: 'bi bi-gift', roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
        { label: 'Vales-troca', link: '/financeiro/vales-troca', icon: 'bi bi-ticket-perforated', roles: ['Admin'], moduloEmpresa: 'vendas' },
        { label: 'Promoções', link: '/vendas/promocoes', icon: 'bi bi-tags', roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
      ]
    },

    {
      label: 'Financeiro', icon: 'bi bi-cash-coin', roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro',
      children: [
        { label: 'Contas a Receber',          link: '/financeiro/receber',       icon: 'bi bi-cash-stack',       roles: this.receberRoles, moduloEmpresa: 'financeiro' },
        { label: 'Contas a Pagar',            link: '/financeiro/pagar',         icon: 'bi bi-wallet2',          roles: this.pagarRoles, moduloEmpresa: 'financeiro' },
        { label: 'Caixa',                     link: '/financeiro/caixa',         icon: 'bi bi-safe',             roles: this.caixaRoles, moduloEmpresa: 'financeiro' },
        { label: 'Contas Bancárias',          link: '/financeiro/contas',        icon: 'bi bi-bank',             roles: this.financeiroRoles, moduloEmpresa: 'financeiro' },
        { label: 'Antecipação de Recebíveis', link: '/financeiro/antecipacoes',  icon: 'bi bi-lightning-charge', roles: this.receberRoles, moduloEmpresa: 'financeiro' },
        { label: 'Movimentações Financeiras', link: '/financeiro/movimentacoes', icon: 'bi bi-arrow-left-right', roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' },
        { label: 'Formas de Pagamento', link: '/financeiro/formas-pagamento', icon: 'bi bi-credit-card', roles: ['Admin'], moduloEmpresa: 'financeiro' },
        { label: 'Prazos de Pagamento', link: '/financeiro/prazos-pagamento', icon: 'bi bi-calendar-range', roles: ['Admin'], moduloEmpresa: 'financeiro' },
        { label: 'Naturezas de Lançamento', link: '/natureza', icon: 'bi bi-list-check', roles: this.cadastrosRoles, moduloEmpresa: 'financeiro' },
        { label: 'Configuração Financeira', link: '/financeiro/configuracao', icon: 'bi bi-sliders', roles: ['Admin'], moduloEmpresa: 'financeiro' },
        { label: 'Consulta por Natureza', link: '/financeiro/consulta-naturezas', icon: 'bi bi-list-columns-reverse', roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' },
      ]
    },

    {
      label: 'Fiscal e Contábil', icon: 'bi bi-receipt', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal_contabil',
      children: [
        { label: 'NCM', link: '/fiscal/ncm', icon: 'bi bi-cash', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal_contabil' },
        { label: 'CFOP', link: '/fiscal/cfop', icon: 'bi bi-file-earmark-text', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal_contabil' },
        { label: 'Tributos', link: '/fiscal/tributos', icon: 'bi bi-percent', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal_contabil' },
        { label: 'Regras Tributárias', link: '/fiscal/regras-tributarias', icon: 'bi bi-sliders', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal_contabil' },
        { label: 'Plano Contábil', link: '/plano-contabil', icon: 'bi bi-diagram-3', roles: this.cadastrosRoles, moduloEmpresa: 'fiscal_contabil' },
        { label: 'Lançamentos Contábeis', link: '/financeiro/lancamentos-contabeis', icon: 'bi bi-journal-check', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal_contabil' },
        { label: 'DRE', link: '/financeiro/dre', icon: 'bi bi-clipboard-data', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal_contabil' },
      ]
    },

    {
      label: 'Dashboards', icon: 'bi bi-speedometer2', roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'operacional',
      children: [
        { label: 'Executivo', link: '/dashboard/executivo', icon: 'bi bi-speedometer2', roles: ['Admin', 'Diretor'], moduloEmpresa: 'operacional' },
        { label: 'Vendas', link: '/dashboard/vendas', icon: 'bi bi-graph-up-arrow', roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'vendas' },
        { label: 'Produtos', link: '/dashboard/produtos', icon: 'bi bi-box-seam', roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'produtos' },
        { label: 'Estoque', link: '/dashboard/estoque', icon: 'bi bi-archive', roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'estoque' },
        { label: 'Financeiro', link: '/dashboard/financeiro', icon: 'bi bi-cash-stack', roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'financeiro' },
        { label: 'Margem / CMV', link: '/relatorios/margem-cmv', icon: 'bi bi-percent', roles: this.vendasGestaoRoles, moduloEmpresa: 'financeiro' },
      ]
    },
  ];

  visibleMenu: NavItem[] = [];
  focusMode = false;
  currentPageTitle = 'Home';
  telaCheia = false;
  barControlsOpen = false;

  constructor() {
    this.refreshMenu();
    this.auth.me().subscribe({
      next: (user) => {
        this.auth.setCurrentUser(user);
        this.refreshMenu();
      },
      error: () => {}
    });
    this.applyRouteState(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.applyRouteState(event.urlAfterRedirects));

    document.addEventListener('fullscreenchange', () => {
      this.telaCheia = !!document.fullscreenElement;
    });
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }

  alternarTelaCheia() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  }

  get showPageBarControls(): boolean {
    const path = this.normalizeUrl(this.router.url);
    return ['/clientes', '/fornecedores', '/lojas', '/funcionarios', '/natureza', '/produtos', '/produtos-uso', '/grupos', '/cores', '/grades', '/packs', '/unidades', '/fiscal/ncm', '/fiscal/cfop', '/fiscal/tributos', '/fiscal/regras-tributarias', '/fiscal/faturamento', '/plano-contabil', '/material', '/financeiro/lancamentos-contabeis', '/estoque/inventario', '/distribuicao', '/distribuicao/pedidos-venda', '/loja/recebimento', '/loja/devolucoes', '/config/usuarios', '/config/perfis', '/config/auditoria', '/financeiro/configuracao', '/financeiro/formas-pagamento', '/financeiro/prazos-pagamento', '/financeiro/vales-troca', '/financeiro/receber', '/financeiro/pagar', '/financeiro/caixa', '/financeiro/contas', '/financeiro/antecipacoes', '/financeiro/movimentacoes', '/producao', '/producao/ficha-tecnica', '/producao/ordens', '/compras/pedidos-revenda', '/compras/pedidos-uso-consumo', '/compras/notas-entrada'].includes(path);
  }

  toggleBarControls(): void {
    this.barControlsOpen = !this.barControlsOpen;
  }

  executarControleBarra(action: 'indicadores' | 'filtros' | 'restaurar'): void {
    const path = this.normalizeUrl(this.router.url);
    const scopes: Record<string, string> = {
      '/clientes': 'clientes',
      '/fornecedores': 'fornecedores',
      '/lojas': 'lojas',
      '/funcionarios': 'funcionarios',
      '/natureza': 'naturezas',
      '/produtos': 'produtos-revenda',
      '/produtos-uso': 'produtos-uso',
      '/grupos': 'grupos',
      '/cores': 'cores',
      '/grades': 'grades',
      '/packs': 'packs',
      '/unidades': 'unidades',
      '/fiscal/ncm': 'ncms',
      '/fiscal/cfop': 'cfops',
      '/fiscal/tributos': 'tributos',
      '/fiscal/regras-tributarias': 'regras-tributarias',
      '/fiscal/faturamento': 'faturamento',
      '/plano-contabil': 'plano-contabil',
      '/material': 'material',
      '/financeiro/lancamentos-contabeis': 'lancamentos-contabeis',
      '/estoque/inventario': 'estoque-inventario',
      '/distribuicao': 'distribuicao',
      '/distribuicao/pedidos-venda': 'pedidos-venda-distribuicao',
      '/loja/recebimento': 'loja-recebimento',
      '/loja/devolucoes': 'devolucoes-vendas',
      '/config/usuarios': 'usuarios',
      '/config/auditoria': 'auditoria',
      '/financeiro/configuracao': 'config-financeira',
      '/financeiro/formas-pagamento': 'formas-pagamento',
      '/financeiro/prazos-pagamento': 'prazos-pagamento',
      '/financeiro/vales-troca': 'vales-troca',
      '/financeiro/receber': 'financeiro-receber',
      '/financeiro/pagar': 'financeiro-pagar',
      '/financeiro/caixa': 'caixas',
      '/financeiro/contas': 'contas-bancarias',
      '/financeiro/antecipacoes': 'antecipacoes-recebiveis',
      '/financeiro/movimentacoes': 'movimentacoes-financeiras',
      '/producao': 'producao',
      '/producao/ficha-tecnica': 'ficha-tecnica',
      '/producao/ordens': 'ordem-producao',
      '/compras/pedidos-revenda': 'pedidos-revenda',
      '/compras/pedidos-uso-consumo': 'pedidos-uso-consumo',
      '/compras/notas-entrada': 'notas-entrada',
    };
    const scope = scopes[path] || 'clientes';
    const eventName = action === 'indicadores'
      ? `sysvar-${scope}-toggle-indicators`
      : action === 'filtros'
        ? `sysvar-${scope}-toggle-filters`
        : `sysvar-${scope}-restore-view`;
    window.dispatchEvent(new CustomEvent(eventName));
    this.barControlsOpen = false;
  }

  sair() {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }

  // Getters únicos (NÃO declare outra propriedade/variável com o mesmo nome)
  get userName(): string {
    return this.auth.getUserName() || 'Usuário';
  }


  get userType(): string {
    const raw = this.auth.getUserType() || '';
    const t = raw.toLowerCase().trim();

    const map: Record<string, string> = {
      'admin': 'Admin',
      'administrador': 'Admin',
      'regular': 'Regular',
      'user': 'Regular',
      'usuário': 'Regular',
      'usuario': 'Regular',
    };

  return map[t] ?? raw ;
  }
  private refreshMenu(): void {
    this.visibleMenu = this.perm.filterMenu(this.menuItems);
  }

  private applyRouteState(url: string) {
    const path = this.normalizeUrl(url);
    this.focusMode = path !== '/home';
    this.sidebarOpen = !this.focusMode;
    this.currentPageTitle = this.findMenuLabel(this.menuItems, path) || 'SYSVAR';
    this.barControlsOpen = false;
  }

  private normalizeUrl(url: string): string {
    const cleanUrl = (url || '/home').split('?')[0].split('#')[0] || '/home';
    return cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
  }

  private findMenuLabel(items: NavItem[], path: string): string | null {
    for (const item of items) {
      if (item.link && this.normalizeUrl(item.link) === path) {
        return item.label;
      }

      if (item.children?.length) {
        const childLabel = this.findMenuLabel(item.children, path);
        if (childLabel) return childLabel;
      }
    }

    return null;
  }

}
