import { jsonResponse } from '../_utils/auth.js';
import { loadCommunityDirectory, findConfirmedMemberByDiscordId, findUniqueMemberById } from '../_utils/community.js';

const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_WINDOW_MS = 60_000;
const MESSAGE_LIMIT_PER_MINUTE = 20;
let messageSchemaPromise = null;

async function ensureMessageTable(env) {
  if (!messageSchemaPromise) {
    messageSchemaPromise = (async () => {
      const db = env.PANTHEON_DB;
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS guild_messages (
          id TEXT PRIMARY KEY,
          conversation_key TEXT NOT NULL,
          sender_discord_id TEXT NOT NULL,
          recipient_discord_id TEXT NOT NULL,
          sender_member_id TEXT NOT NULL,
          recipient_member_id TEXT NOT NULL,
          body TEXT NOT NULL,
          reply_to TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          read_at INTEGER NOT NULL DEFAULT 0
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_messages_conversation ON guild_messages(conversation_key, created_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_messages_recipient_unread ON guild_messages(recipient_discord_id, read_at, created_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_messages_sender ON guild_messages(sender_discord_id, created_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_messages_conversation_read ON guild_messages(conversation_key, recipient_discord_id, sender_discord_id, read_at)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS guild_conversation_inbox (
          owner_discord_id TEXT NOT NULL,
          conversation_key TEXT NOT NULL,
          peer_discord_id TEXT NOT NULL,
          peer_member_id TEXT NOT NULL,
          last_message_id TEXT NOT NULL,
          last_message_body TEXT NOT NULL,
          last_message_at INTEGER NOT NULL,
          last_message_sender_discord_id TEXT NOT NULL,
          unread_count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (owner_discord_id, conversation_key)
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guild_inbox_owner_recent ON guild_conversation_inbox(owner_discord_id, last_message_at DESC)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS guild_message_meta (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          inbox_backfill_done INTEGER NOT NULL DEFAULT 0
        )`),
        db.prepare('INSERT OR IGNORE INTO guild_message_meta (id, inbox_backfill_done) VALUES (1, 0)')
      ]);
      const meta = await db.prepare('SELECT inbox_backfill_done FROM guild_message_meta WHERE id = 1 LIMIT 1').first();
      if (Number(meta?.inbox_backfill_done) !== 1) {
        // One-time migration for any messages created by r60. It creates two compact
        // inbox rows per conversation; subsequent inbox polls never scan message history.
        await db.prepare(`
          WITH expanded AS (
            SELECT conversation_key,
                   sender_discord_id AS owner_discord_id,
                   recipient_discord_id AS peer_discord_id,
                   recipient_member_id AS peer_member_id,
                   id AS last_message_id, body AS last_message_body,
                   created_at AS last_message_at,
                   sender_discord_id AS last_message_sender_discord_id,
                   0 AS unread_delta
            FROM guild_messages
            UNION ALL
            SELECT conversation_key,
                   recipient_discord_id AS owner_discord_id,
                   sender_discord_id AS peer_discord_id,
                   sender_member_id AS peer_member_id,
                   id AS last_message_id, body AS last_message_body,
                   created_at AS last_message_at,
                   sender_discord_id AS last_message_sender_discord_id,
                   CASE WHEN read_at = 0 THEN 1 ELSE 0 END AS unread_delta
            FROM guild_messages
          ), ranked AS (
            SELECT *,
                   ROW_NUMBER() OVER (
                     PARTITION BY conversation_key, owner_discord_id
                     ORDER BY last_message_at DESC, last_message_id DESC
                   ) AS row_number,
                   SUM(unread_delta) OVER (PARTITION BY conversation_key, owner_discord_id) AS unread_total
            FROM expanded
          )
          INSERT OR IGNORE INTO guild_conversation_inbox (
            owner_discord_id, conversation_key, peer_discord_id, peer_member_id,
            last_message_id, last_message_body, last_message_at,
            last_message_sender_discord_id, unread_count
          )
          SELECT owner_discord_id, conversation_key, peer_discord_id, peer_member_id,
                 last_message_id, last_message_body, last_message_at,
                 last_message_sender_discord_id, unread_total
          FROM ranked WHERE row_number = 1
        `).run();
        await db.prepare('UPDATE guild_message_meta SET inbox_backfill_done = 1 WHERE id = 1').run();
      }
      return true;
    })().catch(error => {
      messageSchemaPromise = null;
      throw error;
    });
  }
  return messageSchemaPromise;
}

function conversationKey(a, b) {
  return [String(a), String(b)].sort().join(':');
}

async function getLinkedContext(env, session) {
  const { members } = await loadCommunityDirectory(env);
  const discordId = String(session?.discordId || '').trim();
  const member = findConfirmedMemberByDiscordId(members, discordId);
  if (!member) return { error:'Your Discord account is not linked to one unique Pantheon member profile yet. Ask an administrator to check your Player Ownership link.' };
  const enabled = await env.PANTHEON_DB.prepare('SELECT enabled FROM allowed_users WHERE discord_id = ? LIMIT 1').bind(discordId).first();
  if (!enabled || Number(enabled.enabled) !== 1) return { error:'Your Pantheon account is not currently enabled.' };
  return { discordId, member, members };
}

async function resolveRecipient(env, members, memberId) {
  const member = findUniqueMemberById(members, memberId);
  if (!member) return { error:'That member profile could not be found.' };
  const discordId = String(member.profileConfirmedDiscordId || '').trim();
  if (!discordId) return { error:'This member has not linked a Discord account yet, so they cannot receive messages.' };
  if (members.filter(item => String(item?.profileConfirmedDiscordId || '').trim() === discordId).length !== 1) {
    return { error:'This Discord account is linked to more than one member profile. An administrator must repair the link first.' };
  }
  const enabled = await env.PANTHEON_DB.prepare('SELECT enabled FROM allowed_users WHERE discord_id = ? LIMIT 1').bind(discordId).first();
  if (!enabled || Number(enabled.enabled) !== 1) return { error:'This member account is not currently enabled.' };
  return { member, discordId };
}

async function markConversationRead(env, key, recipientDiscordId, senderDiscordId) {
  const now = Date.now();
  await env.PANTHEON_DB.batch([
    env.PANTHEON_DB.prepare(`UPDATE guild_messages SET read_at = ?
      WHERE conversation_key = ? AND recipient_discord_id = ? AND sender_discord_id = ? AND read_at = 0`)
      .bind(now, key, recipientDiscordId, senderDiscordId),
    env.PANTHEON_DB.prepare(`UPDATE guild_conversation_inbox SET unread_count = 0
      WHERE owner_discord_id = ? AND conversation_key = ?`)
      .bind(recipientDiscordId, key)
  ]);
}

export async function onRequestGet({ request, env, data }) {
  const session = data?.session;
  if (!session?.discordId) return jsonResponse({ error:'Authentication required.' }, 401);
  try {
    await ensureMessageTable(env);
    const linked = await getLinkedContext(env, session);
    if (linked.error) return jsonResponse({ error:linked.error, code:'member_link_required' }, 409);
    const peerMemberId = new URL(request.url).searchParams.get('with') || '';
    if (peerMemberId) {
      const peer = await resolveRecipient(env, linked.members, peerMemberId);
      if (peer.error) return jsonResponse({ error:peer.error }, 404);
      if (peer.discordId === linked.discordId) return jsonResponse({ error:'You cannot open a direct-message conversation with yourself.' }, 400);
      const key = conversationKey(linked.discordId, peer.discordId);
      await markConversationRead(env, key, linked.discordId, peer.discordId);
      const result = await env.PANTHEON_DB.prepare(`
        SELECT id, sender_discord_id, recipient_discord_id, sender_member_id, recipient_member_id, body, reply_to, created_at, read_at
        FROM guild_messages WHERE conversation_key = ? ORDER BY created_at DESC LIMIT 150
      `).bind(key).all();
      const messages = (result.results || []).reverse().map(row => ({
        id:String(row.id), senderDiscordId:String(row.sender_discord_id), recipientDiscordId:String(row.recipient_discord_id),
        senderMemberId:String(row.sender_member_id), recipientMemberId:String(row.recipient_member_id),
        body:String(row.body), replyTo:String(row.reply_to || ''), createdAt:Number(row.created_at)||0, readAt:Number(row.read_at)||0
      }));
      return jsonResponse({ ok:true, messages, peerMemberId:String(peer.member.id), now:Date.now() });
    }

    // Small, indexed inbox summary instead of repeatedly loading up to 1,000 historic messages.
    const result = await env.PANTHEON_DB.prepare(`
      SELECT peer_discord_id, peer_member_id, last_message_body, last_message_at,
             last_message_sender_discord_id, unread_count
      FROM guild_conversation_inbox
      WHERE owner_discord_id = ?
      ORDER BY last_message_at DESC
      LIMIT 100
    `).bind(linked.discordId).all();
    const conversations = (result.results || []).map(row => ({
      otherDiscordId:String(row.peer_discord_id),
      otherMemberId:String(row.peer_member_id),
      lastMessage:String(row.last_message_body || '').slice(0,180),
      lastMessageAt:Number(row.last_message_at)||0,
      lastMessageFromMe:String(row.last_message_sender_discord_id) === linked.discordId,
      unreadCount:Number(row.unread_count)||0
    }));
    return jsonResponse({ ok:true, conversations });
  } catch (error) {
    return jsonResponse({ error:`Could not load messages: ${String(error?.message || error).slice(0,180)}` }, 503);
  }
}

export async function onRequestPost({ request, env, data }) {
  const session = data?.session;
  if (!session?.discordId) return jsonResponse({ error:'Authentication required.' }, 401);
  try {
    await ensureMessageTable(env);
    const linked = await getLinkedContext(env, session);
    if (linked.error) return jsonResponse({ error:linked.error, code:'member_link_required' }, 409);
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse({ error:'Expected a JSON message body.' }, 400); }
    const recipientMemberId = String(body?.toMemberId || '').trim();
    const message = String(body?.body || '').normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    const replyTo = String(body?.replyTo || '').trim().slice(0,80);
    if (!recipientMemberId) return jsonResponse({ error:'Choose a member to message.' }, 400);
    if (!message) return jsonResponse({ error:'Write a message first.' }, 400);
    if ([...message].length > MAX_MESSAGE_LENGTH) return jsonResponse({ error:`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` }, 400);
    const peer = await resolveRecipient(env, linked.members, recipientMemberId);
    if (peer.error) return jsonResponse({ error:peer.error }, 404);
    if (peer.discordId === linked.discordId) return jsonResponse({ error:'You cannot message yourself.' }, 400);
    const key = conversationKey(linked.discordId, peer.discordId);
    if (replyTo) {
      const target = await env.PANTHEON_DB.prepare('SELECT id FROM guild_messages WHERE id = ? AND conversation_key = ? LIMIT 1').bind(replyTo, key).first();
      if (!target) return jsonResponse({ error:'The message you are replying to is no longer in this conversation. Refresh and try again.' }, 409);
    }
    const now = Date.now();
    const recent = await env.PANTHEON_DB.prepare('SELECT COUNT(*) AS n FROM guild_messages WHERE sender_discord_id = ? AND created_at >= ?').bind(linked.discordId, now - MESSAGE_WINDOW_MS).first();
    if (Number(recent?.n) >= MESSAGE_LIMIT_PER_MINUTE) return jsonResponse({ error:'You are sending messages too quickly. Please wait a moment.' }, 429);
    const id = crypto.randomUUID();
    const senderMemberId = String(linked.member.id);
    const recipientDiscordId = peer.discordId;
    const recipientMemberIdStable = String(peer.member.id);
    const db = env.PANTHEON_DB;
    // Use plain positional bindings with one supplied value for every placeholder.
    // This avoids D1 parameter-count ambiguity from the previous mixed numbered/literal form.
    const messageStatement = db.prepare(`INSERT INTO guild_messages
      (id, conversation_key, sender_discord_id, recipient_discord_id, sender_member_id, recipient_member_id, body, reply_to, created_at, read_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, key, linked.discordId, recipientDiscordId, senderMemberId, recipientMemberIdStable, message, replyTo, now, 0);
    const senderInboxStatement = db.prepare(`INSERT INTO guild_conversation_inbox
      (owner_discord_id, conversation_key, peer_discord_id, peer_member_id, last_message_id, last_message_body, last_message_at, last_message_sender_discord_id, unread_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_discord_id, conversation_key) DO UPDATE SET
        peer_member_id = excluded.peer_member_id,
        last_message_id = CASE WHEN excluded.last_message_at >= guild_conversation_inbox.last_message_at THEN excluded.last_message_id ELSE guild_conversation_inbox.last_message_id END,
        last_message_body = CASE WHEN excluded.last_message_at >= guild_conversation_inbox.last_message_at THEN excluded.last_message_body ELSE guild_conversation_inbox.last_message_body END,
        last_message_at = MAX(guild_conversation_inbox.last_message_at, excluded.last_message_at),
        last_message_sender_discord_id = CASE WHEN excluded.last_message_at >= guild_conversation_inbox.last_message_at THEN excluded.last_message_sender_discord_id ELSE guild_conversation_inbox.last_message_sender_discord_id END`)
      .bind(linked.discordId, key, recipientDiscordId, recipientMemberIdStable, id, message, now, linked.discordId, 0);
    const recipientInboxStatement = db.prepare(`INSERT INTO guild_conversation_inbox
      (owner_discord_id, conversation_key, peer_discord_id, peer_member_id, last_message_id, last_message_body, last_message_at, last_message_sender_discord_id, unread_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_discord_id, conversation_key) DO UPDATE SET
        peer_member_id = excluded.peer_member_id,
        last_message_id = CASE WHEN excluded.last_message_at >= guild_conversation_inbox.last_message_at THEN excluded.last_message_id ELSE guild_conversation_inbox.last_message_id END,
        last_message_body = CASE WHEN excluded.last_message_at >= guild_conversation_inbox.last_message_at THEN excluded.last_message_body ELSE guild_conversation_inbox.last_message_body END,
        last_message_at = MAX(guild_conversation_inbox.last_message_at, excluded.last_message_at),
        last_message_sender_discord_id = CASE WHEN excluded.last_message_at >= guild_conversation_inbox.last_message_at THEN excluded.last_message_sender_discord_id ELSE guild_conversation_inbox.last_message_sender_discord_id END,
        unread_count = guild_conversation_inbox.unread_count + 1`)
      .bind(recipientDiscordId, key, linked.discordId, senderMemberId, id, message, now, linked.discordId, 1);
    // The public Guild Forum is now the primary social feature, but legacy DMs remain
    // backward-compatible for cached clients and preserve the existing conversation history.
    await messageStatement.run();
    await senderInboxStatement.run();
    await recipientInboxStatement.run();
    return jsonResponse({ ok:true, message:{ id, senderDiscordId:linked.discordId, recipientDiscordId, senderMemberId, recipientMemberId:recipientMemberIdStable, body:message, replyTo, createdAt:now, readAt:0 } });
  } catch (error) {
    return jsonResponse({ error:`Could not send message: ${String(error?.message || error).slice(0,180)}` }, 503);
  }
}
