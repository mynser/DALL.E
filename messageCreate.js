const { PermissionsBitField } = require('discord.js');
const { getGuildSettings, addWarning, getWarnings } = require('../utils/database');
const { sendLog, formatDuration } = require('../utils/helpers');
const { logEmbed, COLORS } = require('../utils/embeds');

// Spam tracking
const spamMap = new Map(); // userId -> { count, timer, messages[] }
const raidMap = new Map();  // guildId -> { joins: [], locked: bool }

function isZalgo(text) {
  const zalgo = /[\u0300-\u036f\u0489\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
  const matches = text.match(zalgo) || [];
  return matches.length > text.length * 0.3;
}

function hasInvite(text) {
  return /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i.test(text);
}

function hasLink(text) {
  return /https?:\/\/[^\s]+/i.test(text);
}

function isCaps(text) {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 10) return false;
  const upper = letters.replace(/[^A-Z]/g, '');
  return (upper.length / letters.length) > 0.7;
}

function hasBadWords(text, wordList) {
  if (!wordList || !wordList.length) return false;
  const lower = text.toLowerCase();
  return wordList.some(w => lower.includes(w.toLowerCase()));
}

function matchesRegex(text, patterns) {
  if (!patterns || !patterns.length) return false;
  return patterns.some(p => {
    try { return new RegExp(p, 'i').test(text); } catch { return false; }
  });
}

async function automodAction(message, settings, reason, action = 'delete') {
  try {
    if (!message.deletable) return;
    await message.delete().catch(() => {});

    const warn = await message.channel.send({
      content: `${message.author} ⚠️ **AutoMod:** ${reason}`,
    });
    setTimeout(() => warn.delete().catch(() => {}), 5000);

    const embed = logEmbed('🤖 AutoMod Action', `**User:** ${message.author.tag} (${message.author.id})\n**Channel:** ${message.channel}\n**Reason:** ${reason}\n**Content:** ${message.content?.slice(0, 200) || '[no content]'}`, COLORS.warning);
    await sendLog(message.guild, embed, 'log');

    // Auto-warn on severe violations
    if (action === 'warn') {
      addWarning(message.guild.id, message.author.id, message.client.user.id, `[AutoMod] ${reason}`);
      const warnings = getWarnings(message.guild.id, message.author.id);
      await applyThresholdPunishment(message, settings, warnings.length);
    }
  } catch {}
}

async function applyThresholdPunishment(message, settings, warnCount) {
  let thresholds = [];
  try { thresholds = JSON.parse(settings.warn_thresholds || '[]'); } catch {}
  if (!thresholds.length) return;

  const threshold = thresholds.find(t => t.count === warnCount);
  if (!threshold) return;

  const member = message.member;
  if (!member) return;

  try {
    if (threshold.action === 'kick') {
      await member.kick(`AutoMod: Reached ${warnCount} warnings`);
    } else if (threshold.action === 'ban') {
      await member.ban({ reason: `AutoMod: Reached ${warnCount} warnings` });
    } else if (threshold.action === 'timeout') {
      const duration = threshold.duration || 600000;
      await member.timeout(duration, `AutoMod: Reached ${warnCount} warnings`);
    } else if (threshold.action === 'mute') {
      if (settings.mute_role) {
        await member.roles.add(settings.mute_role, `AutoMod: Reached ${warnCount} warnings`);
      }
    }
  } catch {}
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    if (!message.member) return;

    const settings = getGuildSettings(message.guild.id);
    if (!settings.automod_enabled) return;

    // Skip users with manage messages perm or immune roles
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    let immuneRoles = [];
    try { immuneRoles = JSON.parse(settings.immune_roles || '[]'); } catch {}
    if (immuneRoles.some(r => message.member.roles.cache.has(r))) return;

    const content = message.content || '';
    let badWords = [];
    let regexFilters = [];
    try { badWords = JSON.parse(settings.bad_words || '[]'); } catch {}
    try { regexFilters = JSON.parse(settings.custom_regex || '[]'); } catch {}

    // ─── Anti-Spam ────────────────────────────────────────────────────────
    if (settings.anti_spam) {
      const key = `${message.guild.id}-${message.author.id}`;
      const spamData = spamMap.get(key) || { count: 0, lastMessage: 0 };
      const now = Date.now();

      if (now - spamData.lastMessage < 3000) {
        spamData.count++;
      } else {
        spamData.count = 1;
      }
      spamData.lastMessage = now;
      spamMap.set(key, spamData);

      if (spamData.count >= 5) {
        spamData.count = 0;
        return automodAction(message, settings, 'Sending messages too quickly (spam)', 'warn');
      }
    }

    // ─── Anti-Invite ─────────────────────────────────────────────────────
    if (settings.anti_invite && hasInvite(content)) {
      let whitelist = [];
      try { whitelist = JSON.parse(settings.link_whitelist || '[]'); } catch {}
      if (!whitelist.some(w => content.includes(w))) {
        return automodAction(message, settings, 'Discord invite links are not allowed', 'warn');
      }
    }

    // ─── Anti-Link ────────────────────────────────────────────────────────
    if (settings.anti_link && hasLink(content)) {
      let whitelist = [];
      try { whitelist = JSON.parse(settings.link_whitelist || '[]'); } catch {}
      if (!whitelist.some(w => content.includes(w))) {
        return automodAction(message, settings, 'Links are not allowed in this server', 'warn');
      }
    }

    // ─── Anti-Caps ───────────────────────────────────────────────────────
    if (settings.anti_caps && isCaps(content)) {
      return automodAction(message, settings, 'Please avoid using excessive caps');
    }

    // ─── Anti-Zalgo ──────────────────────────────────────────────────────
    if (settings.anti_zalgo && isZalgo(content)) {
      return automodAction(message, settings, 'Zalgo/corrupted text is not allowed', 'warn');
    }

    // ─── Anti-Mention Spam ───────────────────────────────────────────────
    if (settings.anti_mention_spam) {
      const mentions = message.mentions.users.size + message.mentions.roles.size;
      if (mentions >= (settings.max_mentions || 5)) {
        return automodAction(message, settings, `Too many mentions (${mentions})`, 'warn');
      }
    }

    // ─── Bad Word Filter ─────────────────────────────────────────────────
    if (hasBadWords(content, badWords)) {
      return automodAction(message, settings, 'Message contains prohibited words', 'warn');
    }

    // ─── Custom Regex ────────────────────────────────────────────────────
    if (matchesRegex(content, regexFilters)) {
      return automodAction(message, settings, 'Message matches a blocked pattern', 'warn');
    }
  },
};
