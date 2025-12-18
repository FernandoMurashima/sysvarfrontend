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





export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },

      { path: 'clientes', component: ClientesComponent },
      { path: 'lojas', component: LojasComponent },
      { path: 'fornecedores', component: FornecedoresComponent },
      { path: 'funcionarios', component: FuncionariosComponent },
      { path: 'natureza', component: NatLancamentosComponent },
      { path: 'funcionarios', component: FuncionariosComponent },
      { path: 'cores', component: CoresComponent },
      { path: 'colecoes', component: ColecoesComponent},
      { path: 'unidades', component: UnidadesComponent},
      { path: 'grupos', component: GruposComponent }, 
      { path: 'packs', component: PacksComponent },
      { path: 'grades', component: GradesComponent },
      { path: 'produtos', component: ProdutosComponent },
      { path: 'produtos-uso', component: ProdutosUsoComponent },
      { path: 'vendas/tabelas', component: TabelaprecoComponent },
      { path: 'fiscal/ncm', component: NcmsComponent },
      { path: 'material', component: MateriaisComponent },
      { path: 'compras/pedidos-revenda', component: PedidosRevendaComponent },
      { path: 'compras/pedidos-uso-consumo', component: PedidosUsoConsumoComponent },

      { path: 'config/usuarios', component: UsuariosComponent },

      // ⬇️ rota de coleções

      
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'financeiro/formas-pagamento', component: FormasPagamentoComponent },

    ]
  },

  { path: '**', redirectTo: '' }
];
