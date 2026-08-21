import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccessControlService, PerfilAcesso } from '../../core/services/access-control.service';
import { AuthService } from '../../core/auth.service';
import { ModuloSistema } from '../../core/models/empresa';

const PROCESSOS = [
  { grupo: 'Requisições', itens: [
    { codigo: 'requisicoes.fazer', label: 'Fazer requisição' },
    { codigo: 'requisicoes.aprovar', label: 'Aprovar requisição' },
    { codigo: 'requisicoes.atender', label: 'Atender requisição' },
  ] },
  { grupo: 'Cotação', itens: [{ codigo: 'cotacao.aprovar', label: 'Aprovar cotação' }] },
  { grupo: 'Pedido de Compra', itens: [{ codigo: 'pedido_compra.aprovar', label: 'Aprovar pedido de compra' }] },
  { grupo: 'Vendas', itens: [{ codigo: 'vendas.autorizar_desconto', label: 'Autorizar desconto' }] },
];

const SENSIVEIS = [
  { codigo: 'funcionario.salario', label: 'Ver salário' },
  { codigo: 'produto.custo', label: 'Ver custos e margens' },
];

const MODULOS_TECNICOS_REQUISICOES = new Set(['requisicoes', 'requisicoes_analise', 'requisicoes_atendimento', 'requisicoes_todas']);

@Component({
  selector: 'app-perfis-acesso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfis-acesso.component.html',
  styleUrls: ['./perfis-acesso.component.css']
})
export class PerfisAcessoComponent implements OnInit {
  private api = inject(AccessControlService);
  private auth = inject(AuthService);

  perfis: PerfilAcesso[] = [];
  modulos: ModuloSistema[] = [];
  form: PerfilAcesso | null = null;
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  processos = PROCESSOS;
  sensiveis = SENSIVEIS;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('operacional', true) === true || this.auth.getCurrentUser()?.is_company_master === true || this.auth.getCurrentUser()?.is_superuser === true;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.modulos().subscribe({
      next: (res: any) => {
        const disponiveis = new Set(this.auth.getCurrentUser()?.modulos_disponiveis_empresa || []);
        this.modulos = (Array.isArray(res) ? res : res?.results ?? []).filter((m: ModuloSistema) => disponiveis.has(m.chave) && !MODULOS_TECNICOS_REQUISICOES.has(m.chave));
      }
    });
    this.api.perfis().subscribe({
      next: (res: any) => {
        this.perfis = Array.isArray(res) ? res : res?.results ?? [];
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Falha ao carregar perfis.';
        this.loading = false;
      }
    });
  }

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.form = {
      nome: '',
      descricao: '',
      ativo: true,
      padrao: false,
      permissoes_modulos: this.modulos.map(m => ({ modulo: m.id, modulo_chave: m.chave, modulo_nome: m.nome, acesso: 'NONE', pode_excluir: false })),
      permissoes_processos: [...PROCESSOS.flatMap(g => g.itens), ...SENSIVEIS].map(p => ({ codigo: p.codigo, permitido: false }))
    };
  }

  editar(perfil: PerfilAcesso): void {
    const atuais = new Map((perfil.permissoes_modulos || []).map(p => [p.modulo_chave, p]));
    const processos = new Map((perfil.permissoes_processos || []).map(p => [p.codigo, p]));
    this.form = {
      ...perfil,
      permissoes_modulos: this.modulos.map(m => {
        const atual = atuais.get(m.chave);
        return { id: atual?.id, modulo: m.id, modulo_chave: m.chave, modulo_nome: m.nome, acesso: atual?.acesso || 'NONE', pode_excluir: atual?.pode_excluir || false };
      }),
      permissoes_processos: [...PROCESSOS.flatMap(g => g.itens), ...SENSIVEIS].map(p => {
        const atual = processos.get(p.codigo);
        return { id: atual?.id, codigo: p.codigo, permitido: atual?.permitido || false };
      }),
    };
  }

  salvar(): void {
    if (!this.form || !this.podeEditarModulo) return;
    this.saving = true;
    const req = this.form.id ? this.api.updatePerfil(this.form.id, this.form) : this.api.createPerfil(this.form);
    req.subscribe({
      next: () => {
        this.successMsg = 'Perfil salvo.';
        this.form = null;
        this.saving = false;
        this.load();
      },
      error: () => {
        this.errorMsg = 'Não foi possível salvar o perfil.';
        this.saving = false;
      }
    });
  }

  processo(codigo: string): { id?: number; codigo: string; permitido: boolean } {
    const atual = this.form?.permissoes_processos?.find(p => p.codigo === codigo);
    if (atual) return atual;
    const novo = { codigo, permitido: false };
    this.form?.permissoes_processos?.push(novo);
    return novo;
  }
}
