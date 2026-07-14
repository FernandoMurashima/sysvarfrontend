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
      label: 'Cadastros', icon: 'bi bi-journal-text', roles: this.cadastrosRoles, moduloEmpresa: 'cadastros',
      children: [
        { label: 'Empresas',            link: '/empresas',      icon: 'bi bi-buildings',     roles: ['Admin'], superOnly: true },
        { label: 'Lojas',               link: '/lojas',         icon: 'bi bi-shop',          roles: this.cadastrosRoles, moduloEmpresa: 'cadastros' },
        { label: 'Clientes',            link: '/clientes',      icon: 'bi bi-people',        roles: this.clientesRoles, moduloEmpresa: 'cadastros' },
        { label: 'Fornecedores',        link: '/fornecedores',  icon: 'bi bi-truck',         roles: this.comprasRoles, moduloEmpresa: 'cadastros' },
        { label: 'Funcionários',        link: '/funcionarios',  icon: 'bi bi-person-badge',  roles: this.cadastrosRoles, moduloEmpresa: 'cadastros' },
        { label: 'Plano Contábil',      link: '/plano-contabil', icon: 'bi bi-diagram-3',     roles: this.cadastrosRoles, moduloEmpresa: 'cadastros' },
        { label: 'Natureza Lançamento', link: '/natureza', icon: 'bi bi-person-badge',  roles: this.cadastrosRoles, moduloEmpresa: 'cadastros' },
      ]
    },

    {
      label: 'Produtos', icon: 'bi bi-box-seam', roles: this.produtosRoles, moduloEmpresa: 'produtos',
      children: [
        { label: 'Produtos Revenda'    ,   link: '/produtos',      icon: 'bi bi-box',           roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Produtos Uso/consumo',   link: '/produtos-uso',  icon: 'bi bi-box',           roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Grupos',                 link: '/grupos',        icon: 'bi bi-diagram-2',     roles: this.produtosRoles, moduloEmpresa: 'produtos' },        
        { label: 'Cores',                  link: '/cores',         icon: 'bi bi-palette',       roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Grades',                 link: '/grades',        icon: 'bi bi-grid',          roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Coleções',               link: '/colecoes',      icon: 'bi bi-layers',        roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Pack'    ,               link: '/packs'    ,     icon: 'bi bi-bounding-box',  roles: this.produtosRoles, moduloEmpresa: 'produtos' },
        { label: 'Unidades',               link: '/unidades',      icon: 'bi bi-rulers',        roles: this.produtosRoles, moduloEmpresa: 'produtos' },
      ]
    },

    {
      label: 'Fiscal', icon: 'bi bi-receipt', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal',
      children: [
        { label: 'N.C.M'      , link: '/fiscal/ncm' , icon: 'bi bi-cash',                    roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal' },
        { label: 'C.F.O.P'    , link: '/fiscal/cfop', icon: 'bi bi-file-earmark-text',        roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal' },
        { label: 'Tributos'   , link: '/fiscal/tributos', icon: 'bi bi-percent',              roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal' },
        { label: 'Regras Tributárias', link: '/fiscal/regras-tributarias', icon: 'bi bi-sliders', roles: this.vendasGestaoRoles, moduloEmpresa: 'fiscal' },
        { label: 'Material'   , link: '/material'   , icon: 'bi bi-arrow-counterclockwise',  roles: this.produtosRoles, moduloEmpresa: 'fiscal' },       
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

        // adicione outras consultas aqui:
        // { label: 'Por EAN',       link: '/estoque/consulta-ean',         icon: 'bi bi-dot', roles: ['Regular'] },
        // { label: 'Por Loja',      link: '/estoque/consulta-loja',        icon: 'bi bi-dot', roles: ['Regular'] },
      ]
    },
    { label: 'Movimentações', link: '/estoque/movimentacoes', icon: 'bi bi-arrow-left-right', roles: this.estoqueOperacaoRoles, moduloEmpresa: 'estoque' },
    { label: 'Inventário',    link: '/estoque/inventario',    icon: 'bi bi-clipboard-data',  roles: this.estoqueOperacaoRoles, moduloEmpresa: 'estoque' },
  ]
},


    {
      label: 'Vendas', icon: 'bi bi-receipt', roles: ['Caixa', 'Gerente', 'Diretor', 'Vendedor'], moduloEmpresa: 'vendas',
      children: [
        { label: 'PDV'                  , link: '/vendas/pdv',        icon: 'bi bi-display',                roles: this.pdvRoles, moduloEmpresa: 'vendas' },
        { label: 'Consulta de vendas'   , link: '/vendas/relatorios', icon: 'bi bi-bar-chart-line',         roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
        { label: 'Cashback'             , link: '/vendas/cashback',   icon: 'bi bi-gift',                   roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
        { label: 'Promoções'            , link: '/vendas/promocoes',  icon: 'bi bi-tags',                   roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
        { label: 'Devoluções de vendas' , link: '/vendas/devolucoes', icon: 'bi bi-arrow-counterclockwise', roles: this.caixaRoles, moduloEmpresa: 'vendas' },
        { label: 'Tabela de Preço'      , link: '/vendas/tabelas'   , icon: 'bi bi-arrow-counterclockwise', roles: this.vendasGestaoRoles, moduloEmpresa: 'vendas' },
      ]
    },

    {
      label: 'Compras', icon: 'bi bi-receipt', roles: this.comprasRoles, moduloEmpresa: 'compras',
      children: [
        
        { label: 'Pedido de Compra Uso/Consumo' , link: '/compras/pedidos-uso-consumo' , icon: 'bi bi-bag-check',              roles: this.comprasRoles, moduloEmpresa: 'compras' },
        { label: 'Pedido de Compra Revenda'     , link: '/compras/pedidos-revenda'     , icon: 'bi bi-bag-check',              roles: this.comprasRoles, moduloEmpresa: 'compras' },
        { label: 'Entrada de Nf-e'              , link: '/compras/notas-entrada'       , icon: 'bi bi-receipt',               roles: this.comprasRoles, moduloEmpresa: 'compras' },
        { label: 'Notas Lançadas'               , link: '/compras/notas-entrada'       , icon: 'bi bi-receipt-cutoff',        roles: this.comprasRoles, moduloEmpresa: 'compras' },

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
      label: 'Financeiro', icon: 'bi bi-cash-coin', roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro',
      children: [
        { label: 'Contas a Receber',          link: '/financeiro/receber',       icon: 'bi bi-cash-stack',       roles: this.receberRoles, moduloEmpresa: 'financeiro' },
        { label: 'Contas a Pagar',            link: '/financeiro/pagar',         icon: 'bi bi-wallet2',          roles: this.pagarRoles, moduloEmpresa: 'financeiro' },
        { label: 'Caixa',                     link: '/financeiro/caixa',         icon: 'bi bi-safe',             roles: this.caixaRoles, moduloEmpresa: 'financeiro' },
        { label: 'Contas Bancárias',          link: '/financeiro/contas',        icon: 'bi bi-bank',             roles: this.financeiroRoles, moduloEmpresa: 'financeiro' },
        { label: 'Antecipação de Recebíveis', link: '/financeiro/antecipacoes',  icon: 'bi bi-lightning-charge', roles: this.receberRoles, moduloEmpresa: 'financeiro' },
        { label: 'Movimentações Financeiras', link: '/financeiro/movimentacoes', icon: 'bi bi-arrow-left-right', roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' },
        { label: 'Configuração Financeira',   link: '/financeiro/configuracao', icon: 'bi bi-sliders', roles: ['Diretor', 'Gerente'], moduloEmpresa: 'financeiro' },
        { label: 'Consulta por Natureza',     link: '/financeiro/consulta-naturezas', icon: 'bi bi-list-columns-reverse', roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' },
        { label: 'Lançamentos Contábeis',     link: '/financeiro/lancamentos-contabeis', icon: 'bi bi-journal-check', roles: ['Diretor', 'Gerente', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' },
        { label: 'DRE Gerencial',             link: '/financeiro/dre', icon: 'bi bi-clipboard-data', roles: ['Diretor', 'Gerente', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' },
        { label: 'Vales-troca',               link: '/financeiro/vales-troca',   icon: 'bi bi-ticket-perforated', roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber'], moduloEmpresa: 'financeiro' },
        { label: 'Formas de Pagamentos'     , link: '/financeiro/formas-pagamento', icon: 'bi bi-arrow-left-right', roles: this.vendasGestaoRoles, moduloEmpresa: 'financeiro' },
      ]
    },

    {
      label: 'Relatórios', icon: 'bi bi-graph-up', roles: ['Diretor', 'Gerente'], moduloEmpresa: 'relatorios',
      children: [
        { label: 'Vendas'     ,  link: '/relatorios/vendas',     icon: 'bi bi-bar-chart', roles: this.vendasGestaoRoles, moduloEmpresa: 'relatorios' },
        { label: 'Margem / CMV',  link: '/relatorios/margem-cmv', icon: 'bi bi-percent', roles: this.vendasGestaoRoles, moduloEmpresa: 'relatorios' },
        

      ]
    },

    {
      label: 'Configurações', icon: 'bi bi-gear', roles: ['Admin'], moduloEmpresa: 'configuracoes',
      children: [
        { label: 'Usuários',               link: '/config/usuarios',            icon: 'bi bi-person-gear',  roles: ['Admin'], moduloEmpresa: 'configuracoes' },
        
        
      ]
    },
  ];

  visibleMenu: NavItem[] = [];
  focusMode = false;
  currentPageTitle = 'Home';
  telaCheia = false;

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

  sair() {
    this.auth.clearToken();
    this.router.navigateByUrl('/login');
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
