import { LocalDatabase } from '../database/connection';

export class DocumentoLocalService {
  constructor(private readonly db?: LocalDatabase) {}

  async gerarSequencial(prefixo = 'PDV', lojaId?: number | null, caixaId?: number | null): Promise<string> {
    if (!this.db) return this.gerar(prefixo);
    const chave = [prefixo, lojaId || 'L0', caixaId || 'C0'].join(':');
    const now = new Date().toISOString();
    const rows = await this.db.query<{ ultimo_numero: number }>(
      `SELECT ultimo_numero FROM sequencias_locais WHERE chave = ?`,
      [chave]
    );
    const numero = Number(rows[0]?.ultimo_numero || 0) + 1;
    await this.db.execute(
      `INSERT INTO sequencias_locais (chave, ultimo_numero, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(chave) DO UPDATE SET
         ultimo_numero = excluded.ultimo_numero,
         updated_at = excluded.updated_at`,
      [chave, numero, now]
    );
    return `${prefixo}${String(lojaId || 0).padStart(2, '0')}${String(caixaId || 0).padStart(2, '0')}-${String(numero).padStart(6, '0')}`;
  }

  gerar(prefixo = 'PDV'): string {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('');
    return `${prefixo}${stamp}`;
  }
}
