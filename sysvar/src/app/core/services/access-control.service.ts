import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmpresaContrato, EmpresaModulo, ModuloSistema } from '../models/empresa';

export interface PerfilAcesso {
  id?: number;
  empresa?: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
  padrao?: boolean;
  usuarios_count?: number;
  permissoes_modulos?: Array<{ id?: number; modulo: number; modulo_chave?: string; modulo_nome?: string; acesso: 'NONE' | 'VIEW' | 'EDIT'; pode_excluir?: boolean }>;
  permissoes_processos?: Array<{ id?: number; codigo: string; permitido: boolean }>;
}

type ListResp<T> = T[] | { results: T[]; count: number };

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/accounts`;

  modulos(): Observable<ListResp<ModuloSistema>> {
    return this.http.get<ListResp<ModuloSistema>>(`${this.base}/modulos/`);
  }

  contratos(params?: { empresa?: number }): Observable<ListResp<EmpresaContrato>> {
    let p = new HttpParams();
    if (params?.empresa) p = p.set('empresa', String(params.empresa));
    return this.http.get<ListResp<EmpresaContrato>>(`${this.base}/contratos/`, { params: p });
  }

  updateContrato(id: number, payload: Partial<EmpresaContrato>): Observable<EmpresaContrato> {
    return this.http.patch<EmpresaContrato>(`${this.base}/contratos/${id}/`, payload);
  }

  transferirMaster(contratoId: number, usuario_master: number): Observable<EmpresaContrato> {
    return this.http.post<EmpresaContrato>(`${this.base}/contratos/${contratoId}/transferir-master/`, { usuario_master });
  }

  empresaModulos(params?: { empresa?: number }): Observable<ListResp<EmpresaModulo>> {
    let p = new HttpParams();
    if (params?.empresa) p = p.set('empresa', String(params.empresa));
    return this.http.get<ListResp<EmpresaModulo>>(`${this.base}/empresa-modulos/`, { params: p });
  }

  patchEmpresaModulo(id: number, payload: Partial<EmpresaModulo>): Observable<EmpresaModulo> {
    return this.http.patch<EmpresaModulo>(`${this.base}/empresa-modulos/${id}/`, payload);
  }

  perfis(params?: { empresa?: number }): Observable<ListResp<PerfilAcesso>> {
    let p = new HttpParams();
    if (params?.empresa) p = p.set('empresa', String(params.empresa));
    return this.http.get<ListResp<PerfilAcesso>>(`${this.base}/perfis/`, { params: p });
  }

  createPerfil(payload: PerfilAcesso): Observable<PerfilAcesso> {
    return this.http.post<PerfilAcesso>(`${this.base}/perfis/`, payload);
  }

  updatePerfil(id: number, payload: Partial<PerfilAcesso>): Observable<PerfilAcesso> {
    return this.http.patch<PerfilAcesso>(`${this.base}/perfis/${id}/`, payload);
  }

  duplicarPerfil(id: number, nome: string): Observable<PerfilAcesso> {
    return this.http.post<PerfilAcesso>(`${this.base}/perfis/${id}/duplicar/`, { nome });
  }

  definirPerfilPadrao(id: number): Observable<PerfilAcesso> {
    return this.http.post<PerfilAcesso>(`${this.base}/perfis/${id}/definir-padrao/`, {});
  }

  ativarPerfil(id: number): Observable<PerfilAcesso> {
    return this.http.post<PerfilAcesso>(`${this.base}/perfis/${id}/ativar/`, {});
  }

  inativarPerfil(id: number): Observable<PerfilAcesso> {
    return this.http.post<PerfilAcesso>(`${this.base}/perfis/${id}/inativar/`, {});
  }
}
