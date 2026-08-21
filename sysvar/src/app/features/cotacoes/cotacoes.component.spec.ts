import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CotacoesService } from '../../core/services/cotacoes.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { CotacoesComponent } from './cotacoes.component';

describe('CotacoesComponent', () => {
  let fixture: ComponentFixture<CotacoesComponent>;
  let component: CotacoesComponent;
  let api: jasmine.SpyObj<CotacoesService>;
  let requisicoesApi: jasmine.SpyObj<RequisicoesService>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<CotacoesService>('CotacoesService', ['listar', 'criar', 'atualizar', 'listarItens', 'criarItem', 'atualizarItem', 'excluirItem']);
    requisicoesApi = jasmine.createSpyObj<RequisicoesService>('RequisicoesService', ['lojasPermitidas']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['podeAcessarModulo', 'getCurrentUser']);
    api.listar.and.returnValue(of([{ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any]));
    requisicoesApi.lojasPermitidas.and.returnValue(of([{ id: 2, nome_loja: 'Loja A' }]));
    api.criar.and.returnValue(of({ id: 8, numero: 2, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any));
    api.atualizar.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'URGENTE', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any));
    api.listarItens.and.returnValue(of([{ id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Item', quantidade_cotar: '1.000', unidade: 4, permite_alternativo: true } as any]));
    api.criarItem.and.returnValue(of({ id: 11, cotacao: 7, origem: 'AVULSO', descricao: 'Novo', quantidade_cotar: '2.000', unidade: 4, permite_alternativo: true } as any));
    api.atualizarItem.and.returnValue(of({ id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Editado', quantidade_cotar: '3.000', unidade: 4, permite_alternativo: false } as any));
    api.excluirItem.and.returnValue(of(undefined));
    auth.podeAcessarModulo.and.returnValue(true);
    auth.getCurrentUser.and.returnValue({ id: 3, username: 'cotador', empresa: { id: 1, nome: 'Empresa A' } } as any);

    await TestBed.configureTestingModule({
      imports: [CotacoesComponent],
      providers: [
        { provide: CotacoesService, useValue: api },
        { provide: RequisicoesService, useValue: requisicoesApi },
        { provide: AuthService, useValue: auth },
        { provide: ProdutosService, useValue: { list: () => of([{ Idproduto: 5, descricao: 'Produto A', unidade: 4 }]) } },
        { provide: UnidadesService, useValue: { list: () => of([{ Idunidade: 4, Descricao: 'UN' }]) } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CotacoesComponent);
    component = fixture.componentInstance;
  });

  it('carrega listagem e lojas permitidas', () => {
    component.ngOnInit();
    expect(api.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page_size: 500 }));
    expect(requisicoesApi.lojasPermitidas).toHaveBeenCalled();
    expect(component.cotacoes.length).toBe(1);
    expect(component.lojas[0].label).toContain('Loja A');
  });

  it('seleciona automaticamente loja unica e habilita salvar', () => {
    component.ngOnInit();
    component.nova();
    expect(component.form.value.loja).toBe(2);
    expect(component.form.valid).toBeTrue();
  });

  it('exibe Nova Cotacao conforme EDIT', () => {
    auth.podeAcessarModulo.and.returnValue(true);
    expect(component.podeEditar).toBeTrue();
    auth.podeAcessarModulo.and.returnValue(false);
    expect(component.podeEditar).toBeFalse();
  });

  it('salva cabecalho novo', () => {
    component.nova();
    component.form.patchValue({ loja: 2, tipo_compra: 'USO_CONSUMO', prioridade: 'URGENTE', observacao: 'Teste' });
    component.salvar();
    expect(api.criar).toHaveBeenCalledWith(jasmine.objectContaining({ loja: 2, tipo_compra: 'USO_CONSUMO', prioridade: 'URGENTE', observacao: 'Teste' }));
  });

  it('salva edicao de cabecalho em elaboracao', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.form.patchValue({ prioridade: 'URGENTE' });
    component.salvar();
    expect(api.atualizar).toHaveBeenCalledWith(7, jasmine.objectContaining({ prioridade: 'URGENTE' }));
  });

  it('alterna Produto e Avulso preenchendo dados do produto', () => {
    component.ngOnInit();
    component.itemForm.patchValue({ modo: 'PRODUTO', produto: 5 });
    component.produtoSelecionado();
    expect(component.itemForm.value.descricao).toBe('Produto A');
    expect(component.itemForm.value.unidade).toBe(4);
    component.itemForm.patchValue({ modo: 'AVULSO', produto: null, descricao: 'Livre' });
    expect(component.itemForm.value.descricao).toBe('Livre');
  });

  it('adiciona item', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.itemForm.patchValue({ modo: 'AVULSO', descricao: 'Novo', quantidade_cotar: 2, unidade: 4 });
    component.salvarItem();
    expect(api.criarItem).toHaveBeenCalledWith(jasmine.objectContaining({ cotacao: 7, descricao: 'Novo', quantidade_cotar: 2, unidade: 4 }));
  });

  it('edita item', () => {
    const item = { id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Item', quantidade_cotar: '1.000', unidade: 4, permite_alternativo: true } as any;
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.editarItem(item);
    component.itemForm.patchValue({ descricao: 'Editado' });
    component.salvarItem();
    expect(api.atualizarItem).toHaveBeenCalledWith(10, jasmine.objectContaining({ descricao: 'Editado' }));
  });

  it('exclui item e bloqueia visual fora de elaboracao', () => {
    const aberta = { id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'ABERTA' } as any;
    component.abrir(aberta);
    expect(component.podeEditarItens).toBeFalse();
    component.excluirItem({ id: 10 } as any);
    expect(api.excluirItem).not.toHaveBeenCalled();
    component.abrir({ ...aberta, status: 'EM_ELABORACAO' });
    component.excluirItem({ id: 10 } as any);
    expect(api.excluirItem).toHaveBeenCalledWith(10);
  });
});
