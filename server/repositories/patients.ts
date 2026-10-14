import type { Pool } from 'pg';
import type { Identity } from '../auth/identity.js';
import { withIdentity } from '../db/transaction.js';
import { patientCreate, patientUpdate, recordId, type Patient, type PatientInput } from '../domain/patient.js';

const fields = ['mrn','first_name','last_name','dob','sex','email','phone','notes'] as const;
const projection = 'id, mrn, first_name, last_name, dob::text, sex, email, phone, notes, created_at, updated_at';
export class Patients {
  constructor(private readonly pool: Pool) {}
  async list(identity: Identity, limit = 50, offset = 0): Promise<Patient[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 100000) {
      throw new Error('Invalid pagination');
    }
    return withIdentity(this.pool, identity, async client => {
      const result = await client.query<Patient>(`select ${projection} from neurosync.patients
        where owner_uid = $1 order by created_at desc, id desc limit $2 offset $3`, [identity.subject, limit, offset]);
      await client.query(`insert into neurosync.audit_log(actor_uid, action, table_name, row_id)
        select $1, 'read', 'patients', unnest($2::text[])`, [identity.subject, result.rows.map(row => row.id)]);
      return result.rows;
    });
  }
  async get(identity: Identity, id: string): Promise<Patient | null> {
    recordId.parse(id);
    return withIdentity(this.pool, identity, async client => {
      const result = await client.query<Patient>(`select ${projection} from neurosync.patients where id=$1 and owner_uid=$2`, [id, identity.subject]);
      if (result.rows[0]) await client.query(`insert into neurosync.audit_log(actor_uid, action, table_name, row_id)
        values ($1,'read','patients',$2)`, [identity.subject, id]);
      return result.rows[0] ?? null;
    });
  }
  async create(identity: Identity, input: unknown): Promise<Patient> {
    const data = patientCreate.parse(input);
    return withIdentity(this.pool, identity, async client => {
      const result = await client.query<Patient>(`insert into neurosync.patients
        (owner_uid, ${fields.join(',')}) values ($1,${fields.map((_,i) => `$${i+2}`).join(',')}) returning ${projection}`,
        [identity.subject, ...fields.map(key => data[key] ?? null)]);
      const row = result.rows[0];
      if (!row) throw new Error('Patient insert returned no record');
      return row;
    });
  }
  async update(identity: Identity, id: string, input: unknown): Promise<Patient | null> {
    recordId.parse(id);
    const data: PatientInput = patientUpdate.parse(input);
    const keys = fields.filter(key => Object.hasOwn(data, key)); // identifiers from constant allowlist only
    return withIdentity(this.pool, identity, async client => {
      const result = await client.query<Patient>(`update neurosync.patients set ${keys.map((key,i) => `${key}=$${i+3}`).join(',')}
        where id=$1 and owner_uid=$2 returning ${projection}`, [id, identity.subject, ...keys.map(key => data[key])]);
      return result.rows[0] ?? null;
    });
  }
  async delete(identity: Identity, id: string): Promise<boolean> {
    recordId.parse(id);
    return withIdentity(this.pool, identity, async client => {
      const result = await client.query('delete from neurosync.patients where id=$1 and owner_uid=$2', [id, identity.subject]);
      return result.rowCount === 1;
    });
  }
}
