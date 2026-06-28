const ms = require('ms');
const { PermissionsBitField } = require('discord.js');
const { getGuildSettings } = require('./database');

function parseDuration(input) {
  if (!input) return null;
  const parsed = ms(input);
  if (!parsed || isNaN(parsed)) return null;
  return parsed;
}

function formatDuration(ms_val) {
  if (!ms_val) return 'Permanent';
  const seconds = Math.floor(ms_val / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTimestamp(unix) {
  if (!unix) return 'Never';
  return `<t:${Math.floor(unix)}:R>`;
}

function canModerate(interaction, target) {
  const { guild, member } = interaction;

  if (target.id === guild.ownerId) return { ok: false, reason: 'Cannot moderate the server owner.' };
  if (target.id === interaction.client.user.id) return { ok: false, reason: 'Cannot moderate myself.' };
  if (target.id === member.id) return { ok: false, reason: 'Cannot moderate yourself.' };

  const botMember = guild.members.me;
  if (target.roles.highest.position >= botMember.roles.highest.position) {
    return { ok: false, reason: 'My role is not high enough to moderate this user.' };
  }
  if (target.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id) {
    return { ok: false, reason: 'Your role is not high enough to moderate this user.' };
  }

  return { ok: true };
}

async function sendLog(guild, embed, type = 'mod') {
  try {
    const settings = getGuildSettings(guild.id);
    const channelId = type === 'mod' ? settings.mod_log_channel : settings.log_channel;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    await channel.send({ embeds: [embed] });
  } catch {}
}

function hasPermission(member, ...perms) {
  return member.permissions.has(perms);
}

function isModerator(member) {
  return member.permissions.has([
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.ManageMessages,
  ], false);
}

function truncate(str, max = 1024) {
  if (!str) return 'None';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

module.exports = { parseDuration, formatDuration, formatTimestamp, canModerate, sendLog, hasPermission, isModerator, truncate };
