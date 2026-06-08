// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

import { ClientesComponent } from './features/clientes/clientes.component';
import { LojasComponent } from './features/lojas/lojas.component';
import { FornecedoresComponent } from './features/fornecedores/fornecedores.component';
import { FuncionariosComponent } from './features/funcionarios/funcionarios.component';
import { NatLancamentosComponent } from './features/natureza-lancamento/natureza-lancamento.component';
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
import { MateriaisComponent } from './features/material/materiais.component';
import { FormasPagamentoComponent } from './features/formas-pagamento/formas-pagamento.component';
import { ProdutosUsoComponent } from './features/produtos-uso/produtos-uso.component';
import { PedidosRevendaComponent } from './features/pedidos-revenda/pedidos-revenda.component';
import { PedidosUsoConsumoComponent } from './features/pedidos-uso-consumo/pedidos-uso-consumo.component';
import { NotasFiscaisEntradaComponent } from './features/notas-fiscais-entrada/notas-fiscais-entrada.component';
import { FinanceiroTitulosComponent } from './features/financeiro-titulos/financeiro-titulos.component';
import { CaixasComponent } from './features/caixas/caixas.component';
import { ContasBancariasComponent } from './features/contas-bancarias/contas-bancarias.component';
import { MovimentacoesFinanceirasComponent } from './features/movimentacoes-financeiras/movimentacoes-financeiras.component';
import { EstoqueConsultaComponent } from './features/estoque-consulta/estoque-consulta.component';
import { EstoqueMovimentacoesComponent } from './features/estoque-movimentacoes/estoque-movimentacoes.component';
import { EstoqueInventarioComponent } from './features/estoque-inventario/estoque-inventario.component';
import { PdvComponent } from './features/pdv/pdv.component';
import { RelatoriosVendasComponent } from './features/relatorios-vendas/relatorios-vendas.component';
import { CashbackComponent } from './features/cashback/cashback.component';
import { PromocoesComponent } from './features/promocoes/promocoes.component';
import { DevolucoesVendasComponent } from './features/devolucoes-vendas/devolucoes-vendas.component';





export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },

      { path: 'clientes', component: ClientesComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'Vendedor', 'AssistenteReceber'] } },
      { path: 'lojas', component: LojasComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'fornecedores', component: FornecedoresComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'] } },
      { path: 'funcionarios', component: FuncionariosComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'natureza', component: NatLancamentosComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'cores', component: CoresComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'colecoes', component: ColecoesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'unidades', component: UnidadesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'grupos', component: GruposComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } }, 
      { path: 'packs', component: PacksComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'grades', component: GradesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'produtos', component: ProdutosComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'produtos-uso', component: ProdutosUsoComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'vendas/pdv', component: PdvComponent, data: { roles: ['Caixa', 'Gerente'] } },
      { path: 'vendas/relatorios', component: RelatoriosVendasComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'vendas/cashback', component: CashbackComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'vendas/promocoes', component: PromocoesComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'vendas/devolucoes', component: DevolucoesVendasComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa'] } },
      { path: 'relatorios/vendas', component: RelatoriosVendasComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'vendas/tabelas', component: TabelaprecoComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'fiscal/ncm', component: NcmsComponent, data: { roles: ['Diretor', 'Gerente'] } },
      { path: 'material', component: MateriaisComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'compras/pedidos-revenda', component: PedidosRevendaComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'] } },
      { path: 'compras/pedidos-uso-consumo', component: PedidosUsoConsumoComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'] } },
      { path: 'compras/notas-entrada', component: NotasFiscaisEntradaComponent, data: { roles: ['Diretor', 'Gerente', 'AssistentePagar'] } },
      { path: 'financeiro/pagar', component: FinanceiroTitulosComponent, data: { tipo: 'pagar', roles: ['Diretor', 'Gerente', 'AssistentePagar'] } },
      { path: 'financeiro/receber', component: FinanceiroTitulosComponent, data: { tipo: 'receber', roles: ['Diretor', 'Gerente', 'AssistenteReceber'] } },
      { path: 'financeiro/caixa', component: CaixasComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa'] } },
      { path: 'financeiro/contas', component: ContasBancariasComponent, data: { roles: ['Diretor', 'Gerente', 'AssistenteReceber', 'AssistentePagar'] } },
      { path: 'financeiro/movimentacoes', component: MovimentacoesFinanceirasComponent, data: { roles: ['Diretor', 'Gerente', 'Caixa', 'AssistenteReceber', 'AssistentePagar'] } },
      { path: 'estoque/consulta-referencia', component: EstoqueConsultaComponent, data: { modo: 'matriz', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'] } },
      { path: 'estoque/consulta-movimentacao-referencia', component: EstoqueConsultaComponent, data: { modo: 'movimentos', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'] } },
      { path: 'estoque/consulta-colest', component: EstoqueConsultaComponent, data: { modo: 'colecao', roles: ['Diretor', 'Gerente', 'Auxiliar', 'Caixa', 'Vendedor'] } },
      { path: 'estoque/movimentacoes', component: EstoqueMovimentacoesComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },
      { path: 'estoque/inventario', component: EstoqueInventarioComponent, data: { roles: ['Diretor', 'Gerente', 'Auxiliar'] } },

      { path: 'config/usuarios', component: UsuariosComponent, data: { roles: ['Admin'] } },

      // ⬇️ rota de coleções

      
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'financeiro/formas-pagamento', component: FormasPagamentoComponent, data: { roles: ['Diretor', 'Gerente'] } },

    ]
  },

  { path: '**', redirectTo: '' }
];
