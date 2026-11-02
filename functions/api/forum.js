import { jsonResponse } from '../_utils/auth.js';
import { loadCommunityDirectory, findConfirmedMemberByDiscordId } from '../_utils/community.js';

const POST_CATEGORIES = new Set(['achievement','raid','announcement','party','general']);
const MAX_TITLE = 100;
const MAX_BODY = 2200;
const MAX_IMAGE_DATA = 360000; // roughly 270 KB after base64 encoding
const WINDOW_MS = 10 * 60 * 1000;
let forumSchemaPromise = null;

async function ensureForumSchema(env) {
  if (!forumSchemaPromise) {
    const db = env.PANTHEON_DB;
    forumSchemaPromise = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS guild_forum_posts (
        id TEXT PRIMARY KEY,
        author_discord_id TEXT NOT NULL,
        author_member_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        image_data TEXT NOT NULL DEFAULT '',
        image_mime TEXT NOT NULL DEFAULT '',
        comments_count INTEGER NOT NULL DEFAULT 0,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_forum_posts_recent ON guild_forum_posts(is_deleted, is_pinned DESC, created_at DESC)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_forum_posts_category_recent ON guild_forum_posts(category, is_deleted, is_pinned DESC, created_at DESC)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_forum_posts_author ON guild_forum_posts(author_discord_id, created_at DESC)'),
      db.prepare(`CREATE TABLE IF NOT EXISTS guild_forum_comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        author_discord_id TEXT NOT NULL,
        author_member_id TEXT NOT NULL,
        parent_comment_id TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        is_deleted INTEGER NOT NULL DEFAULT 0
      )`),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_forum_comments_post ON guild_forum_comments(post_id, created_at)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_forum_comments_author ON guild_forum_comments(author_discord_id, created_at DESC)')
    ]).then(() => true).catch(error => { forumSchemaPromise = null; throw error; });
  }
  return forumSchemaPromise;
}

async function getActor(env, session) {
  const discordId = String(session?.discordId || '').trim();
  if (!discordId) return { error:'Authentication required.', status:401 };
  const { members } = await loadCommunityDirectory(env);
  const member = findConfirmedMemberByDiscordId(members, discordId);
  if (!member) return { error:'Your Discord account is not linked to one unique Pantheon member profile.', status:409 };
  const enabled = await env.PANTHEON_DB.prepare('SELECT role, enabled FROM allowed_users WHERE discord_id = ? LIMIT 1').bind(discordId).first();
  if (!enabled || Number(enabled.enabled) !== 1) return { error:'Your Pantheon account is not enabled.', status:403 };
  return { discordId, member, members, role:String(enabled.role || 'member') };
}

function cleanText(value, max) {
  return String(value || '').normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0,max);
}
function authorName(members, discordId) {
  const member = members.find(item => String(item?.profileConfirmedDiscordId || '').trim() === String(discordId));
  return String(member?.name || 'Pantheon Member').slice(0,60);
}
function postDto(row, actor) {
  return {
    id:String(row.id), authorDiscordId:String(row.author_discord_id), authorMemberId:String(row.author_member_id),
    authorName:String(row.author_name || 'Pantheon Member'), category:String(row.category || 'general'),
    title:String(row.title || ''), body:String(row.body || ''), hasImage:Number(row.has_image) === 1,
    commentsCount:Number(row.comments_count) || 0, pinned:Number(row.is_pinned) === 1,
    createdAt:Number(row.created_at) || 0, updatedAt:Number(row.updated_at) || 0,
    canDelete:String(row.author_discord_id) === actor.discordId || actor.role === 'admin'
  };
}

export async function onRequestGet({ request, env, data }) {
  try {
    const actor = await getActor(env, data?.session);
    if (actor.error) return jsonResponse({ error:actor.error }, actor.status);
    await ensureForumSchema(env);
    const url = new URL(request.url);
    const imageFor = cleanText(url.searchParams.get('imageFor'),80);
    if (imageFor) {
      const row = await env.PANTHEON_DB.prepare('SELECT image_data, image_mime FROM guild_forum_posts WHERE id = ? AND is_deleted = 0 AND image_data <> \'\' LIMIT 1').bind(imageFor).first();
      if (!row) return jsonResponse({ error:'Photo not found.' },404);
      const encoded = String(row.image_data || '');
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      return new Response(bytes, { status:200, headers:{
        'Content-Type':String(row.image_mime || 'image/jpeg'),
        'Cache-Control':'private, max-age=300',
        'X-Content-Type-Options':'nosniff',
        'Content-Disposition':'inline'
      }});
    }
    const commentsFor = cleanText(url.searchParams.get('commentsFor'),80);
    if (commentsFor) {
      const post = await env.PANTHEON_DB.prepare('SELECT id FROM guild_forum_posts WHERE id = ? AND is_deleted = 0 LIMIT 1').bind(commentsFor).first();
      if (!post) return jsonResponse({ error:'Guild post not found.' },404);
      const rows = await env.PANTHEON_DB.prepare(`
        SELECT id, author_discord_id, author_member_id, parent_comment_id, body, created_at
        FROM guild_forum_comments WHERE post_id = ? AND is_deleted = 0
        ORDER BY created_at ASC LIMIT 100
      `).bind(commentsFor).all();
      return jsonResponse({ ok:true, comments:(rows.results || []).map(row => ({
        id:String(row.id), authorDiscordId:String(row.author_discord_id), authorMemberId:String(row.author_member_id),
        authorName:authorName(actor.members,row.author_discord_id), parentCommentId:String(row.parent_comment_id || ''),
        body:String(row.body || ''), createdAt:Number(row.created_at) || 0,
        canDelete:String(row.author_discord_id) === actor.discordId || actor.role === 'admin'
      })) });
    }
    const category = cleanText(url.searchParams.get('category'),24);
    const before = Number(url.searchParams.get('before')) || 0;
    const limit = Math.min(30, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const postColumns = `id, author_discord_id, author_member_id, category, title, body,
      CASE WHEN image_data <> '' THEN 1 ELSE 0 END AS has_image,
      comments_count, is_pinned, created_at, updated_at`;
    let rows;
    if (category && POST_CATEGORIES.has(category)) {
      rows = before
        ? await env.PANTHEON_DB.prepare(`SELECT ${postColumns} FROM guild_forum_posts WHERE is_deleted = 0 AND category = ? AND created_at < ? ORDER BY is_pinned DESC, created_at DESC LIMIT ?`).bind(category,before,limit).all()
        : await env.PANTHEON_DB.prepare(`SELECT ${postColumns} FROM guild_forum_posts WHERE is_deleted = 0 AND category = ? ORDER BY is_pinned DESC, created_at DESC LIMIT ?`).bind(category,limit).all();
    } else {
      rows = before
        ? await env.PANTHEON_DB.prepare(`SELECT ${postColumns} FROM guild_forum_posts WHERE is_deleted = 0 AND created_at < ? ORDER BY is_pinned DESC, created_at DESC LIMIT ?`).bind(before,limit).all()
        : await env.PANTHEON_DB.prepare(`SELECT ${postColumns} FROM guild_forum_posts WHERE is_deleted = 0 ORDER BY is_pinned DESC, created_at DESC LIMIT ?`).bind(limit).all();
    }
    const posts = (rows.results || []).map(row => postDto({ ...row, author_name:authorName(actor.members,row.author_discord_id) },actor));
    return jsonResponse({ ok:true, posts, nextBefore:posts.length ? Math.min(...posts.map(item => item.createdAt)) : 0, now:Date.now() });
  } catch (error) {
    return jsonResponse({ error:`Could not load the Guild Forum: ${String(error?.message || error).slice(0,180)}` },503);
  }
}

export async function onRequestPost({ request, env, data }) {
  try {
    const actor = await getActor(env, data?.session);
    if (actor.error) return jsonResponse({ error:actor.error },actor.status);
    await ensureForumSchema(env);
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse({ error:'Expected a Guild Forum post.' },400); }
    const kind = String(body?.type || 'post');
    const now = Date.now();
    if (kind === 'post') {
      const category = cleanText(body?.category,24).toLowerCase();
      const title = cleanText(body?.title,MAX_TITLE);
      const text = cleanText(body?.body,MAX_BODY);
      const imageDataUrl = String(body?.imageDataUrl || '');
      if (!POST_CATEGORIES.has(category)) return jsonResponse({ error:'Choose a valid Guild Forum category.' },400);
      if (category === 'announcement' && actor.role !== 'admin') return jsonResponse({ error:'Only administrators can publish guild announcements. You can still post achievements, runs, party calls, and general discussions.' },403);
      if (!title) return jsonResponse({ error:'Add a title to your post.' },400);
      if (!text && !imageDataUrl) return jsonResponse({ error:'Add some text or a photo to your post.' },400);
      let imageData = '', imageMime = '';
      if (imageDataUrl) {
        if (imageDataUrl.length > MAX_IMAGE_DATA || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)) {
          return jsonResponse({ error:'Guild photos must be compressed JPEG, PNG, or WebP images under about 270 KB. Choose a smaller photo.' },413);
        }
        const comma = imageDataUrl.indexOf(',');
        imageMime = imageDataUrl.slice(5,imageDataUrl.indexOf(';'));
        imageData = imageDataUrl.slice(comma + 1);
        if (!imageData || imageData.length > MAX_IMAGE_DATA - 64) return jsonResponse({ error:'Photo is too large. Choose a smaller image.' },413);
      }
      const recent = await env.PANTHEON_DB.prepare('SELECT COUNT(*) AS n FROM guild_forum_posts WHERE author_discord_id = ? AND created_at >= ? AND is_deleted = 0').bind(actor.discordId,now - WINDOW_MS).first();
      if (Number(recent?.n) >= 8) return jsonResponse({ error:'Please wait before creating another post. The Guild Forum has a short posting limit.' },429);
      const id = crypto.randomUUID();
      await env.PANTHEON_DB.prepare(`
        INSERT INTO guild_forum_posts (id, author_discord_id, author_member_id, category, title, body, image_data, image_mime, comments_count, is_pinned, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      `).bind(id,actor.discordId,String(actor.member.id),category,title,text,imageData,imageMime,now,now).run();
      return jsonResponse({ ok:true, post:{ id, authorDiscordId:actor.discordId, authorMemberId:String(actor.member.id), authorName:String(actor.member.name || 'Pantheon Member'), category, title, body:text, hasImage:!!imageData, commentsCount:0, pinned:false, createdAt:now, updatedAt:now, canDelete:true } });
    }
    if (kind === 'comment') {
      const postId = cleanText(body?.postId,80);
      const text = cleanText(body?.body,1500);
      const parentCommentId = cleanText(body?.parentCommentId,80);
      if (!postId || !text) return jsonResponse({ error:'Choose a post and write a reply.' },400);
      const post = await env.PANTHEON_DB.prepare('SELECT id FROM guild_forum_posts WHERE id = ? AND is_deleted = 0 LIMIT 1').bind(postId).first();
      if (!post) return jsonResponse({ error:'That guild forum post no longer exists.' },404);
      if (parentCommentId) {
        const parent = await env.PANTHEON_DB.prepare('SELECT id FROM guild_forum_comments WHERE id = ? AND post_id = ? AND is_deleted = 0 LIMIT 1').bind(parentCommentId,postId).first();
        if (!parent) return jsonResponse({ error:'The comment you are replying to could not be found.' },409);
      }
      const recent = await env.PANTHEON_DB.prepare('SELECT COUNT(*) AS n FROM guild_forum_comments WHERE author_discord_id = ? AND created_at >= ?').bind(actor.discordId,now - 60_000).first();
      if (Number(recent?.n) >= 30) return jsonResponse({ error:'You are replying too quickly. Please wait a moment.' },429);
      const id = crypto.randomUUID();
      await env.PANTHEON_DB.prepare(`INSERT INTO guild_forum_comments (id, post_id, author_discord_id, author_member_id, parent_comment_id, body, created_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`)
        .bind(id,postId,actor.discordId,String(actor.member.id),parentCommentId,text,now).run();
      await env.PANTHEON_DB.prepare('UPDATE guild_forum_posts SET comments_count = comments_count + 1, updated_at = ? WHERE id = ?').bind(now,postId).run();
      return jsonResponse({ ok:true, comment:{ id, postId, authorDiscordId:actor.discordId, authorMemberId:String(actor.member.id), authorName:String(actor.member.name || 'Pantheon Member'), parentCommentId, body:text, createdAt:now, canDelete:true } });
    }
    return jsonResponse({ error:'Unsupported Guild Forum action.' },400);
  } catch (error) {
    return jsonResponse({ error:`Could not save your Guild Forum entry: ${String(error?.message || error).slice(0,180)}` },503);
  }
}

export async function onRequestDelete({ request, env, data }) {
  try {
    const actor = await getActor(env, data?.session);
    if (actor.error) return jsonResponse({ error:actor.error },actor.status);
    await ensureForumSchema(env);
    const url = new URL(request.url);
    const commentId = cleanText(url.searchParams.get('commentId'),80);
    const postId = cleanText(url.searchParams.get('postId'),80);
    if (commentId) {
      const row = await env.PANTHEON_DB.prepare('SELECT id, post_id, author_discord_id FROM guild_forum_comments WHERE id = ? AND is_deleted = 0 LIMIT 1').bind(commentId).first();
      if (!row) return jsonResponse({ error:'Comment not found.' },404);
      if (String(row.author_discord_id) !== actor.discordId && actor.role !== 'admin') return jsonResponse({ error:'You can only remove your own comment.' },403);
      await env.PANTHEON_DB.prepare('UPDATE guild_forum_comments SET is_deleted = 1 WHERE id = ?').bind(commentId).run();
      await env.PANTHEON_DB.prepare(`UPDATE guild_forum_comments SET parent_comment_id = '' WHERE parent_comment_id = ? AND post_id = ?`).bind(commentId,String(row.post_id)).run();
      await env.PANTHEON_DB.prepare('UPDATE guild_forum_posts SET comments_count = MAX(0, comments_count - 1), updated_at = ? WHERE id = ?').bind(Date.now(),String(row.post_id)).run();
      return jsonResponse({ ok:true });
    }
    if (postId) {
      const row = await env.PANTHEON_DB.prepare('SELECT id, author_discord_id FROM guild_forum_posts WHERE id = ? AND is_deleted = 0 LIMIT 1').bind(postId).first();
      if (!row) return jsonResponse({ error:'Post not found.' },404);
      if (String(row.author_discord_id) !== actor.discordId && actor.role !== 'admin') return jsonResponse({ error:'You can only remove your own post.' },403);
      await env.PANTHEON_DB.prepare('UPDATE guild_forum_posts SET is_deleted = 1, updated_at = ? WHERE id = ?').bind(Date.now(),postId).run();
      await env.PANTHEON_DB.prepare('UPDATE guild_forum_comments SET is_deleted = 1 WHERE post_id = ?').bind(postId).run();
      return jsonResponse({ ok:true });
    }
    return jsonResponse({ error:'Choose a post or comment to remove.' },400);
  } catch (error) {
    return jsonResponse({ error:`Could not remove Guild Forum entry: ${String(error?.message || error).slice(0,180)}` },503);
  }
}

export async function onRequestPatch({ request, env, data }) {
  try {
    const actor = await getActor(env, data?.session);
    if (actor.error) return jsonResponse({ error:actor.error },actor.status);
    if (actor.role !== 'admin') return jsonResponse({ error:'Only administrators can pin Guild Forum posts.' },403);
    await ensureForumSchema(env);
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse({ error:'Expected a post update.' },400); }
    const postId = cleanText(body?.postId,80);
    if (!postId) return jsonResponse({ error:'Post ID is required.' },400);
    const pinned = body?.pinned === true ? 1 : 0;
    const result = await env.PANTHEON_DB.prepare('UPDATE guild_forum_posts SET is_pinned = ?, updated_at = ? WHERE id = ? AND is_deleted = 0').bind(pinned,Date.now(),postId).run();
    if (Number(result?.meta?.changes) !== 1) return jsonResponse({ error:'Post not found.' },404);
    return jsonResponse({ ok:true, pinned:!!pinned });
  } catch (error) {
    return jsonResponse({ error:`Could not update Guild Forum post: ${String(error?.message || error).slice(0,180)}` },503);
  }
}
