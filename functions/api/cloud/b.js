import { jsonResponse, storeRecord } from '../../_utils/auth.js';

export async function onRequestPost({ request, env }) {
  let record;
  try { record = await request.json(); } catch (_) { return jsonResponse({ message: 'Invalid JSON body.' }, 400); }
  const id = crypto.randomUUID().replaceAll('-', '');
  const name = request.headers.get('X-Bin-Name') || 'Pantheon record';
  try {
    await storeRecord(env, id, record, name);
    return jsonResponse({ metadata: { id, private: true, name }, record });
  } catch (error) {
    return jsonResponse({ message: String(error?.message || error) }, 413);
  }
}
