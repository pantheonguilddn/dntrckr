import { jsonResponse } from '../_utils/auth.js';
import { loadCommunityDirectory, findConfirmedMemberByDiscordId, findUniqueMemberById } from '../_utils/community.js';

const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_WINDOW_MS = 60_000;
const MESSAGE_LIMIT_PER_MINUTE = 20;

async function ensureMessageTable(env) {
  await env.PANTHEON_DB.prepare(`CREATE TABLE IF NOT EXISTS guild_messages (
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
  )`).run();
  await env.PANTHEON_DB.prepare('CREATE INDEX IF NOT EXISTS idx_guild_messages_conversation ON guild_messages(conversation_key, created_at)').run();
  await env.PANTHEON_DB.prepare('CREATE INDEX IF NOT EXISTS idx_guild_messages_recipient_unread ON guild_messages(recipient_discord_id, read_at, created_at)').run();
  await env.PANTHEON_DB.prepare('CREATE INDEX IF NOT EXISTS idx_guild_messages_sender ON guild_messages(sender_discord_id, created_at)').run();
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
      const now = Date.now();
      await env.PANTHEON_DB.prepare(`UPDATE guild_messages SET read_at = ? WHERE conversation_key = ? AND recipient_discord_id = ? AND sender_discord_id = ? AND read_at = 0`)
        .bind(now, key, linked.discordId, peer.discordId).run();
      const result = await env.PANTHEON_DB.prepare(`
        SELECT id, sender_discord_id, recipient_discord_id, sender_member_id, recipient_member_id, body, reply_to, created_at, read_at
        FROM guild_messages WHERE conversation_key = ? ORDER BY created_at DESC LIMIT 150
      `).bind(key).all();
      const messages = (result.results || []).reverse().map(row => ({
        id:String(row.id), senderDiscordId:String(row.sender_discord_id), recipientDiscordId:String(row.recipient_discord_id),
        senderMemberId:String(row.sender_member_id), recipientMemberId:String(row.recipient_member_id),
        body:String(row.body), replyTo:String(row.reply_to || ''), createdAt:Number(row.created_at)||0, readAt:Number(row.read_at)||0
      }));
      return jsonResponse({ ok:true, messages, peerMemberId:String(peer.member.id), now });
    }

    const result = await env.PANTHEON_DB.prepare(`
      SELECT id, conversation_key, sender_discord_id, recipient_discord_id, sender_member_id, recipient_member_id, body, created_at, read_at
      FROM guild_messages
      WHERE sender_discord_id = ? OR recipient_discord_id = ?
      ORDER BY created_at DESC LIMIT 1000
    `).bind(linked.discordId, linked.discordId).all();
    const conversations = new Map();
    for (const row of result.results || []) {
      const isSender = String(row.sender_discord_id) === linked.discordId;
      const otherDiscordId = isSender ? String(row.recipient_discord_id) : String(row.sender_discord_id);
      let item = conversations.get(otherDiscordId);
      if (!item) {
        item = {
          otherDiscordId,
          otherMemberId:isSender ? String(row.recipient_member_id) : String(row.sender_member_id),
          lastMessage:String(row.body || '').slice(0,180),
          lastMessageAt:Number(row.created_at)||0,
          lastMessageFromMe:isSender,
          unreadCount:0
        };
        conversations.set(otherDiscordId, item);
      }
      if (!isSender && String(row.recipient_discord_id) === linked.discordId && Number(row.read_at) === 0) item.unreadCount += 1;
    }
    return jsonResponse({ ok:true, conversations:[...conversations.values()].sort((a,b)=>b.lastMessageAt-a.lastMessageAt) });
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
    await env.PANTHEON_DB.prepare(`
      INSERT INTO guild_messages (id, conversation_key, sender_discord_id, recipient_discord_id, sender_member_id, recipient_member_id, body, reply_to, created_at, read_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(id, key, linked.discordId, peer.discordId, String(linked.member.id), String(peer.member.id), message, replyTo, now, 0).run();
    return jsonResponse({ ok:true, message:{ id, senderDiscordId:linked.discordId, recipientDiscordId:peer.discordId, senderMemberId:String(linked.member.id), recipientMemberId:String(peer.member.id), body:message, replyTo, createdAt:now, readAt:0 } });
  } catch (error) {
    return jsonResponse({ error:`Could not send message: ${String(error?.message || error).slice(0,180)}` }, 503);
  }
}
