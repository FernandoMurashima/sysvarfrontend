// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

import { ClientesComponent } from './features/clientes/clientes.component';
import { EmpresasComponent } from './features/empresas/empresas.component';
import { LojasComponent } from './features/lojas/lojas.component';
import { FornecedoresComponent } from './features/fornecedores/fornecedores.component';
import { FuncionariosComponent } from './features/funcionarios/funcionarios.component';
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
import { ProdutosUsoComponent } from './features/produtos-uso/produtos-uso.component';
import { PedidosRevendaComponent } from './features/pedidos-revenda/pedidos-revenda.component';
import { PedidosUsoConsumoComponent } from './features/pedidos-uso-consumo/pedidos-uso-consumo.component';
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
import { PdvComponent } from './features/pdv/pdv.component';
import { RelatoriosVendasComponent } from './features/relatorios-vendas/relatorios-vendas.component';
import { RelatorioMargemComponent } from './features/relatorio-margem/relatorio-margem.component';
import { CashbackComponent } from './features/cashback/cashback.component';
import { PromocoesComponent } from './features/promocoes/promocoes.component';
import { DevolucoesVendasComponent } from './features/devolucoes-vendas/devolucoes-vendas.component';
import { ValesTrocaComponent } from './features/vales-troca/vales-troca.component';
import { ProducaoHomeComponent } from './features/producao-home/producao-home.component';
import { FichaTecnicaComponent } from './features/ficha-tecnica/ficha-tecnica.component';
import { OrdemProducaoComponent } from './features/ordem-producao/ordem-producao.component';





export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },

      { path: 'empresas', component: EmpresasComponent, data: { roles: ['Admin'], superOnly: true } },
      { path: 'clientes', component: ClientesComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'Vendedor', 'AssistenteReceber'], moduloEmpresa: 'cadastros' } },
      { path: 'lojas', component: LojasComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'fornecedores', component: FornecedoresComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'cadastros' } },
      { path: 'funcionarios', component: FuncionariosComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'natureza', component: NatLancamentosComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'plano-contabil', component: PlanoContabilComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'cadastros' } },
      { path: 'cores', component: CoresComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'colecoes', component: ColecoesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'unidades', component: UnidadesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'grupos', component: GruposComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } }, 
      { path: 'packs', component: PacksComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'grades', component: GradesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'produtos', component: ProdutosComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'produtos-uso', component: ProdutosUsoComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'produtos' } },
      { path: 'vendas/pdv', component: PdvComponent, data: { roles: ['Caixa', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/relatorios', component: RelatoriosVendasComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/cashback', component: CashbackComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/promocoes', component: PromocoesComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'vendas/devolucoes', component: DevolucoesVendasComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa'], moduloEmpresa: 'vendas' } },
      { path: 'relatorios/vendas', component: RelatoriosVendasComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'relatorios' } },
      { path: 'relatorios/margem-cmv', component: RelatorioMargemComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'relatorios' } },
      { path: 'vendas/tabelas', component: TabelaprecoComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'vendas' } },
      { path: 'fiscal/ncm', component: NcmsComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal' } },
      { path: 'fiscal/cfop', component: CfopsComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal' } },
      { path: 'fiscal/tributos', component: TributosComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal' } },
      { path: 'fiscal/regras-tributarias', component: RegrasTributariasComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'fiscal' } },
      { path: 'material', component: MateriaisComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'fiscal' } },
      { path: 'compras/pedidos-revenda', component: PedidosRevendaComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'compras' } },
      { path: 'compras/pedidos-uso-consumo', component: PedidosUsoConsumoComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'], moduloEmpresa: 'compras' } },
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
      { path: 'financeiro/configuracao', component: ConfigFinanceiraComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/consulta-naturezas', component: ConsultaFinanceiraNaturezaComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/lancamentos-contabeis', component: LancamentosContabeisComponent, data: { roles: ['Diretor', 'Gerente', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/dre', component: DreGerencialComponent, data: { roles: ['Diretor', 'Gerente', 'AssistenteReceber', 'AssistentePagar'], moduloEmpresa: 'financeiro' } },
      { path: 'financeiro/vales-troca', component: ValesTrocaComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber'], moduloEmpresa: 'financeiro' } },
      { path: 'estoque/consulta-referencia', component: EstoqueConsultaComponent, data: { modo: 'matriz', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/consulta-movimentacao-referencia', component: EstoqueConsultaComponent, data: { modo: 'movimentos', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/consulta-colest', component: EstoqueConsultaComponent, data: { modo: 'colecao', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/movimentacoes', component: EstoqueMovimentacoesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'estoque' } },
      { path: 'estoque/inventario', component: EstoqueInventarioComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'], moduloEmpresa: 'estoque' } },

      { path: 'config/usuarios', component: UsuariosComponent, data: { roles: ['Admin'], moduloEmpresa: 'configuracoes' } },

      // ⬇️ rota de coleções

      
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'financeiro/formas-pagamento', component: FormasPagamentoComponent, data: { roles: ['Diretor', 'Gerente'], moduloEmpresa: 'financeiro' } },

    ]
  },

  { path: '**', redirectTo: '' }
];
