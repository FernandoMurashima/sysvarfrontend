// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

import { ClientesComponent } from './features/clientes/clientes.component';
import { EmpresasComponent } from './features/empresas/empresas.component';
import { LojasComponent } from './features/lojas/lojas.component';
import { LojasAjudaComponent } from './features/ajuda/lojas-ajuda/lojas-ajuda.component';
import { FornecedoresComponent } from './features/fornecedores/fornecedores.component';
import { FuncionariosComponent } from './features/funcionarios/funcionarios.component';
import { CargosComponent } from './features/cargos/cargos.component';
import { NatLancamentosComponent } from './features/natureza-lancamento/natureza-lancamento.component';
import { PlanoContabilComponent } from './features/plano-contabil/plano-contabil.component';
import { CoresComponent } from './features/cores/cores.component';
import { ColecoesComponent } from './features/colecoes/colecoes.component';
import { UnidadesComponent } from './features/unidades/unidades.component';
import { GruposComponent } from './features/grupos/grupos.component';
import { PacksComponent } from './features/Pack/packs.component';
import { GradesComponent } from './features/Grade/grades.component';
// usuários
import { UsuariosComponent } from './features/usuarios/usuarios.component';
import { ProdutosComponent } from './features/Produtos/produtos.component';
// import { ProdutoLookupComponent } from './features/Produtos/produto-lookup/produto-lookup.component';
import { TabelaprecoComponent } from './features/TabelasPreco/tabelapreco.component';
import { NcmsComponent } from './features/Ncms/ncms.component';
import { CfopsComponent } from './features/cfops/cfops.component';
import { TributosComponent } from './features/tributos/tributos.component';
import { RegrasTributariasComponent } from './features/regras-tributarias/regras-tributarias.component';
import { MateriaisComponent } from './features/material/materiais.component';
import { FormasPagamentoComponent } from './features/formas-pagamento/formas-pagamento.component';
import { PrazosPagamentoComponent } from './features/prazos-pagamento/prazos-pagamento.component';
import { ProdutosUsoComponent } from './features/produtos-uso/produtos-uso.component';
import { InsumosComponent } from './features/insumos/insumos.component';
import { PedidosCompraComponent } from './features/pedidos-compra/pedidos-compra.component';
import { CotacoesComponent } from './features/cotacoes/cotacoes.component';
import { RequisicoesComponent } from './features/requisicoes/requisicoes.component';
import { OrdensServicoComponent } from './features/ordens-servico/ordens-servico.component';
import { SetoresComponent } from './features/setores/setores.component';
import { MatrizRequisicaoComponent } from './features/matriz-requisicao/matriz-requisicao.component';
import { CategoriasMaterialComponent } from './features/categorias-material/categorias-material.component';
import { FinalidadesAquisicaoComponent } from './features/finalidades-aquisicao/finalidades-aquisicao.component';
import { NotasFiscaisEntradaComponent } from './features/notas-fiscais-entrada/notas-fiscais-entrada.component';
import { FinanceiroTitulosComponent } from './features/financeiro-titulos/financeiro-titulos.component';
import { CaixasComponent } from './features/caixas/caixas.component';
import { ContasBancariasComponent } from './features/contas-bancarias/contas-bancarias.component';
import { AntecipacaoRecebiveisComponent } from './features/antecipacao-recebiveis/antecipacao-recebiveis.component';
import { ConsultaFinanceiraNaturezaComponent } from './features/consulta-financeira-natureza/consulta-financeira-natureza.component';
import { LancamentosContabeisComponent } from './features/lancamentos-contabeis/lancamentos-contabeis.component';
import { DreGerencialComponent } from './features/dre-gerencial/dre-gerencial.component';
import { MovimentacoesFinanceirasComponent } from './features/movimentacoes-financeiras/movimentacoes-financeiras.component';
import { ConfigFinanceiraComponent } from './features/config-financeira/config-financeira.component';
import { EstoqueConsultaComponent } from './features/estoque-consulta/estoque-consulta.component';
import { EstoqueMovimentacoesComponent } from './features/estoque-movimentacoes/estoque-movimentacoes.component';
import { EstoqueInventarioComponent } from './features/estoque-inventario/estoque-inventario.component';
import { EstoqueEtiquetasComponent } from './features/estoque-etiquetas/estoque-etiquetas.component';
import { DistribuicaoComponent } from './features/distribuicao/distribuicao.component';
import { PedidosVendaDistribuicaoComponent } from './features/pedidos-venda-distribuicao/pedidos-venda-distribuicao.component';
import { FaturamentoComponent } from './features/faturamento/faturamento.component';
import { LojaRecebimentoComponent } from './features/loja-recebimento/loja-recebimento.component';
import { PdvComponent } from './features/pdv/pdv.component';
import { PdvDesktopComponent } from './features/pdv-desktop/pdv-desktop.component';
import { RelatoriosVendasComponent } from './features/relatorios-vendas/relatorios-vendas.component';
import { RelatorioMargemComponent } from './features/relatorio-margem/relatorio-margem.component';
import { CashbackComponent } from './features/cashback/cashback.component';
import { PromocoesComponent } from './features/promocoes/promocoes.component';
import { DevolucoesVendasComponent } from './features/devolucoes-vendas/devolucoes-vendas.component';
import { ValesTrocaComponent } from './features/vales-troca/vales-troca.component';
import { ProducaoHomeComponent } from './features/producao-home/producao-home.component';
import { FichaTecnicaComponent } from './features/ficha-tecnica/ficha-tecnica.component';
import { OrdemProducaoComponent } from './features/ordem-producao/ordem-producao.component';
import { DashboardExecutivoComponent } from './features/dashboard-executivo/dashboard-executivo.component';
import { DashboardProdutosComponent } from './features/dashboard-produtos/dashboard-produtos.component';
import { DashboardVendasComponent } from './features/dashboard-vendas/dashboard-vendas.component';
import { DashboardEstoqueComponent } from './features/dashboard-estoque/dashboard-estoque.component';
import { DashboardFinanceiroComponent } from './features/dashboard-financeiro/dashboard-financeiro.component';
import { PerfisAcessoComponent } from './features/perfis-acesso/perfis-acesso.component';
import { AuditoriaComponent } from './features/auditoria/auditoria.component';
import { ChangePasswordRequiredComponent } from './features/change-password-required/change-password-required.component';





export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'change-password-required', component: ChangePasswordRequiredComponent, data: { allowPasswordChange: true } },

      { path: 'empresas', component: EmpresasComponent, data: { moduloEmpresa: 'operacional' } },
      { path: 'clientes', component: ClientesComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'Vendedor', 'AssistenteReceber'], moduloEmpresa: 'cadastros' } },
      { path: 'lojas', component: LojasComponent, data: { moduloEmpresa: 'operacional' } },
      { path: 'ajuda/lojas', component: LojasAjudaComponent, data: { moduloEmpresa: 'operacional' } },
      { path: 'fornecedores', component: FornecedoresComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'cadastros' } },
      { path: 'funcionarios', component: FuncionariosComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'cargos', component: CargosComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'setores', component: SetoresComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'matriz-requisicao', component: MatrizRequisicaoComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'categorias-material', component: CategoriasMaterialComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'finalidades-aquisicao', component: FinalidadesAquisicaoComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'natureza', component: NatLancamentosComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'financeiro' } },
      { path: 'plano-contabil', component: PlanoContabilComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal_contabil' } },
      { path: 'cores', component: CoresComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'colecoes', component: ColecoesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'unidades', component: UnidadesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'grupos', component: GruposComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } }, 
      { path: 'packs', component: PacksComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'grades', component: GradesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'produtos', component: ProdutosComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'produtos-uso', component: ProdutosUsoComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'insumos', component: InsumosComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'vendas/pdv', component: PdvComponent, data: { roles: ['Caixa', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/pdv-desktop', redirectTo: 'loja/pdv-offline', pathMatch: 'full' },
      { path: 'vendas/relatorios', component: RelatoriosVendasComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/cashback', component: CashbackComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/promocoes', component: PromocoesComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/devolucoes', redirectTo: 'loja/devolucoes', pathMatch: 'full' },
      { path: 'relatorios/vendas', component: RelatoriosVendasComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'dashboard/executivo', component: DashboardExecutivoComponent, data: { roles: ['Admin', 'Diretor'], moduloEmpresa: 'operacional' } },
      { path: 'dashboard/produtos', component: DashboardProdutosComponent, data: { roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'produtos' } },
      { path: 'dashboard/vendas', component: DashboardVendasComponent, data: { roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'dashboard/estoque', component: DashboardEstoqueComponent, data: { roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'estoque' } },
      { path: 'dashboard/financeiro', component: DashboardFinanceiroComponent, data: { roles: ['Admin', 'Diretor', 'Gerente'], moduloEmpresa: 'financeiro' } },
      { path: 'relatorios/margem-cmv', component: RelatorioMargemComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'financeiro' } },
      { path: 'vendas/tabelas', component: TabelaprecoComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'produtos' } },
      { path: 'fiscal/ncm', component: NcmsComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal_contabil' } },
      { path: 'fiscal/cfop', component: CfopsComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal_contabil' } },
      { path: 'fiscal/tributos', component: TributosComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal_contabil' } },
      { path: 'fiscal/regras-tributarias', component: RegrasTributariasComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal_contabil' } },
      { path: 'fiscal/faturamento', component: FaturamentoComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'distribuicao' } },
      { path: 'material', component: MateriaisComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'requisicoes', component: RequisicoesComponent, data: { moduloEmpresaAnyOf: ['requisicoes', 'requisicoes_analise', 'requisicoes_atendimento', 'requisicoes_todas'], processoAnyOf: ['requisicoes.fazer', 'requisicoes.aprovar', 'requisicoes.atender'] } },
      { path: 'ordens-servico', component: OrdensServicoComponent, data: { processoAnyOf: ['requisicoes.atender'] } },
      { path: 'compras/requisicoes', redirectTo: 'requisicoes', pathMatch: 'full' },
      { path: 'compras/pedidos', component: PedidosCompraComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'compras' } },
      { path: 'compras/cotacoes', component: CotacoesComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'compras' } },
      { path: 'compras/pedidos-revenda', redirectTo: 'compras/pedidos', pathMatch: 'full' },
      { path: 'compras/pedidos-uso-consumo', redirectTo: 'compras/pedidos', pathMatch: 'full' },
      { path: 'compras/notas-entrada', component: NotasFiscaisEntradaComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'compras' } },
      { path: 'producao', component: ProducaoHomeComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'producao' } },
      { path: 'producao/ficha-tecnica', component: FichaTecnicaComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'producao' } },
      { path: 'producao/ordens', component: OrdemProducaoComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'producao' } },
      { path: 'financeiro/pagar', component: FinanceiroTitulosComponent, data: { tipo: 'pagar', roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/receber', component: FinanceiroTitulosComponent, data: { tipo: 'receber', roles: ['Diretor', 'Gerente', 'AssistenteReceber'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/caixa', component: CaixasComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/contas', component: ContasBancariasComponent, data: { roles: ['Diretor', 'Gerente', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/antecipacoes', component: AntecipacaoRecebiveisComponent, data: { roles: ['Diretor', 'Gerente', 'AssistenteReceber'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/movimentacoes', component: MovimentacoesFinanceirasComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/configuracao', component: ConfigFinanceiraComponent, data: { roles: ['Admin'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/prazos-pagamento', component: PrazosPagamentoComponent, data: { roles: ['Admin'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/consulta-naturezas', component: ConsultaFinanceiraNaturezaComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/lancamentos-contabeis', component: LancamentosContabeisComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal_contabil' } },
      { path: 'financeiro/dre', component: DreGerencialComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal_contabil' } },
      { path: 'financeiro/vales-troca', component: ValesTrocaComponent, data: { roles: ['Admin'], moduloEmpresa: 'vendas' } },
      { path: 'estoque/consulta-referencia', component: EstoqueConsultaComponent, data: { modo: 'matriz', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/consulta-movimentacao-referencia', component: EstoqueConsultaComponent, data: { modo: 'movimentos', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/consulta-colest', component: EstoqueConsultaComponent, data: { modo: 'colecao', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/movimentacoes', component: EstoqueMovimentacoesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/inventario', component: EstoqueInventarioComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'estoque' } },
      { path: 'distribuicao', component: DistribuicaoComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'distribuicao' } },
      { path: 'distribuicao/pedidos-venda', component: PedidosVendaDistribuicaoComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'distribuicao' } },
      { path: 'estoque/etiquetas', component: EstoqueEtiquetasComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'estoque' } },
      { path: 'loja/recebimento', component: LojaRecebimentoComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa'], moduloEmpresa: 'estoque' } },
      { path: 'loja/pdv-offline', component: PdvDesktopComponent, data: { roles: ['Caixa', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'loja/devolucoes', component: DevolucoesVendasComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa'], moduloEmpresa: 'vendas' } },

      { path: 'config/usuarios', component: UsuariosComponent, data: { moduloEmpresa: 'operacional' } },
      { path: 'config/perfis', component: PerfisAcessoComponent, data: { moduloEmpresa: 'operacional' } },
      { path: 'config/auditoria', component: AuditoriaComponent, data: { moduloEmpresa: 'auditoria' } },

      // ⬇️ rota de coleções

      
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'financeiro/formas-pagamento', component: FormasPagamentoComponent, data: { roles: ['Admin'], moduloEmpresa: 'financeiro' } },

    ]
  },

  { path: '**', redirectTo: '' }
];
