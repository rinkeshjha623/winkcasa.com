import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
export function makeDB(appDir = new URL('../../', import.meta.url).pathname){
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(appDir+'/schema.sql','utf8'));
  // The blog table was created by hand in production, so no migration makes it: give the tests the same base table.
  db.exec("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', author TEXT, image TEXT, seo_title TEXT, seo_description TEXT, published INTEGER NOT NULL DEFAULT 0, published_at TEXT, created_at TEXT DEFAULT (datetime('now')))");
  for (const f of fs.readdirSync(appDir+'/migrations').filter(x=>x.endsWith('.sql')).sort()) { for(const st of fs.readFileSync(appDir+'/migrations/'+f,'utf8').split(/;\s*\n/)){ if(!st.trim()) continue; try{ db.exec(st); }catch(e){ if(!/duplicate column|already exists|no such table: posts/.test(e.message)) console.error('migration',f,e.message.slice(0,80)); } } }
  for(const c of ['delivery_min_at','delivery_max_at']) try{db.exec('ALTER TABLE orders ADD COLUMN '+c+' TEXT')}catch{}
  db.exec("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,email TEXT,phone TEXT,order_ref TEXT,message TEXT,created_at TEXT DEFAULT (datetime('now')))");
  const stmt=(sql,args=[])=>({
    bind:(...a)=>stmt(sql,a),
    async run(){ const r=db.prepare(sql).run(...args); return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}; },
    async first(){ return db.prepare(sql).get(...args)||null; },
    async all(){ return {results:db.prepare(sql).all(...args)}; },
    _sql:sql,_args:args
  });
  return { raw:db, prepare:(s)=>stmt(s), async batch(list){ const out=[]; for(const s of list) out.push(await s.run()); return out; }, async exec(s){db.exec(s)} };
}
