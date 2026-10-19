/**
 * Copia el CATÁLOGO de producción a staging (sedes, categorías, tipos, tamaños,
 * SKU, productos, insumos, recetas, stock y tanques).
 *
 * - Producción solo se LEE (únicamente peticiones GET).
 * - Nunca copia datos personales: ni clientes, pedidos, perfiles o usuarios, ni
 *   el contacto/teléfono/email/NIT del negocio guardado en stores.config, ni los
 *   proveedores de los productos.
 * - Solo escribe columnas que existen en staging (informa las descartadas).
 * - Se niega a escribir si el destino no es el proyecto de staging.
 *
 * Credenciales: VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY de .env
 * (producción) y de .env.staging (staging). No se imprimen.
 *
 * Uso:
 *   node scripts/copy-catalog-to-staging.js           # simulación: solo lee y compara
 *   node scripts/copy-catalog-to-staging.js --apply   # escribe en staging (upsert)
 */
import fs from 'node:fs';
import path from 'node:path';

const PROD_REF = 'uznmoxeypmgkqesfuqhp';
const STAGING_REF = 'llzdxcujvagctnzjymqh';
const PAGE_SIZE = 1000;

// Orden de dependencias (claves foráneas). pk = columna para el upsert.
const TABLES = [
  { name: 'stores', pk: 'id', transform: sanitizeStore },
  { name: 'categories', pk: 'id' },
  { name: 'product_types_config', pk: 'code' },
  { name: 'sizes', pk: 'id' },
  { name: 'sku_acronyms', pk: 'id' },
  { name: 'products', pk: 'id', transform: sanitizeProduct },
  { name: 'inventory_items', pk: 'id' },
  { name: 'recipes', pk: 'id' },
  { name: 'store_stock', pk: 'id' },
  { name: 'machine_tanks', pk: 'id' },
];

/** Campos con datos de contacto o identificación que no salen de producción. */
const PRIVATE_BUSINESS_FIELDS = ['contact_name', 'email', 'phone', 'nit_doc'];
const PRIVATE_MENU_FIELDS = ['phones', 'notification_users'];

function omit(object, keys) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return object;
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}

function sanitizeStore(row) {
  const config = row.config && typeof row.config === 'object' ? row.config : {};
  return {
    ...row,
    config: {
      ...config,
      ...(config.business ? { business: omit(config.business, PRIVATE_BUSINESS_FIELDS) } : {}),
      ...(config.digitalMenu ? { digitalMenu: omit(config.digitalMenu, PRIVATE_MENU_FIELDS) } : {}),
    },
  };
}

function sanitizeProduct(row) {
  // suppliers no se copia: sin proveedor ni su nombre.
  return { ...row, supplier_id: null, supplier_name: null };
}

function readEnvFile(fileName) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) throw new Error(`No existe ${fileName}`);
  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

function loadProject(fileName, expectedRef) {
  const env = readEnvFile(fileName);
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`${fileName} necesita VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY`);
  if (!url.includes(expectedRef)) {
    throw new Error(`${fileName} no apunta al proyecto esperado (${expectedRef}); se cancela por seguridad.`);
  }
  return { url: url.replace(/\/$/, ''), key };
}

function headers(project, extra = {}) {
  return { apikey: project.key, Authorization: `Bearer ${project.key}`, ...extra };
}

async function readAll(project, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await fetch(`${project.url}/rest/v1/${table}?select=*`, {
      method: 'GET',
      headers: headers(project, { Range: `${from}-${from + PAGE_SIZE - 1}`, 'Range-Unit': 'items' }),
    });
    if (!response.ok) throw new Error(`Lectura de ${table} falló (${response.status}): ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Columnas de cada tabla del destino, según el OpenAPI de PostgREST. */
async function targetColumns(project) {
  const response = await fetch(`${project.url}/rest/v1/`, { method: 'GET', headers: headers(project) });
  if (!response.ok) throw new Error(`No se pudo leer el esquema de staging (${response.status})`);
  const spec = await response.json();
  const definitions = spec.definitions ?? {};
  return Object.fromEntries(
    Object.entries(definitions).map(([table, definition]) => [table, new Set(Object.keys(definition.properties ?? {}))]),
  );
}

async function upsert(project, table, pk, rows) {
  if (rows.length === 0) return;
  const response = await fetch(`${project.url}/rest/v1/${table}?on_conflict=${pk}`, {
    method: 'POST',
    headers: headers(project, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Escritura en ${table} falló (${response.status}): ${await response.text()}`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const source = loadProject('.env', PROD_REF);
  const target = loadProject('.env.staging', STAGING_REF);
  if (target.url === source.url) throw new Error('Origen y destino son el mismo proyecto; se cancela.');

  console.log(apply ? 'Modo: ESCRIBIR en staging' : 'Modo: simulación (no escribe nada)');
  const columnsByTable = await targetColumns(target);

  for (const { name, pk, transform } of TABLES) {
    const columns = columnsByTable[name];
    if (!columns) throw new Error(`La tabla ${name} no existe en staging`);
    if (!columns.has(pk)) throw new Error(`La tabla ${name} de staging no tiene la columna clave ${pk}`);

    const sourceRows = (await readAll(source, name)).map((row) => (transform ? transform(row) : row));
    const dropped = new Set();
    const rows = sourceRows.map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(([column]) => {
          if (columns.has(column)) return true;
          dropped.add(column);
          return false;
        }),
      ),
    );

    const droppedNote = dropped.size ? ` | columnas sin equivalente en staging: ${[...dropped].join(', ')}` : '';
    console.log(`${name}: ${rows.length} filas${droppedNote}`);
    if (apply) await upsert(target, name, pk, rows);
  }

  console.log(apply ? 'Listo: catálogo copiado a staging.' : 'Simulación terminada. Ejecuta con --apply para escribir.');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
