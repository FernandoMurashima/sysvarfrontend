import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccessControlService, PerfilAcesso } from '../../core/services/access-control.service';
import { AuthService } from '../../core/auth.service';
import { ModuloSistema } from '../../core/models/empresa';

const REQUISICOES_DIREITOS: Record<string, { label: string; active: 'VIEW' | 'EDIT' }> = {
  requisicoes: { label: 'Requisitar', active: 'EDIT' },
  requisicoes_analise: { label: 'Analisar', active: 'EDIT' },
  requisicoes_atendimento: { label: 'Atender', active: 'EDIT' },
  requisicoes_todas: { label: 'Visualizar todas', active: 'VIEW' },
};

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
        this.modulos = (Array.isArray(res) ? res : res?.results ?? []).filter((m: ModuloSistema) => disponiveis.has(m.chave));
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
      permissoes_modulos: this.modulos.map(m => ({ modulo: m.id, modulo_chave: m.chave, modulo_nome: m.nome, acesso: 'NONE' }))
    };
  }

  editar(perfil: PerfilAcesso): void {
    const atuais = new Map((perfil.permissoes_modulos || []).map(p => [p.modulo_chave, p]));
    this.form = {
      ...perfil,
      permissoes_modulos: this.modulos.map(m => {
        const atual = atuais.get(m.chave);
        return { id: atual?.id, modulo: m.id, modulo_chave: m.chave, modulo_nome: m.nome, acesso: atual?.acesso || 'NONE' };
      })
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

  isDireitoRequisicoes(perm: { modulo_chave?: string }): boolean {
    return Boolean(perm.modulo_chave && REQUISICOES_DIREITOS[perm.modulo_chave]);
  }

  direitoRequisicoesLabel(perm: { modulo_chave?: string; modulo_nome?: string }): string {
    return (perm.modulo_chave && REQUISICOES_DIREITOS[perm.modulo_chave]?.label) || perm.modulo_nome || perm.modulo_chave || '';
  }

  direitoRequisicoesAtivo(perm: { acesso: string }): boolean {
    return perm.acesso !== 'NONE';
  }

  setDireitoRequisicoes(perm: { modulo_chave?: string; acesso: string }, ativo: boolean): void {
    if (!perm.modulo_chave || !REQUISICOES_DIREITOS[perm.modulo_chave]) return;
    perm.acesso = ativo ? REQUISICOES_DIREITOS[perm.modulo_chave].active : 'NONE';
  }
}
