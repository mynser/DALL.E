const { EmbedBuilder } = require('discord.js');

const COLORS = {
  success: 0x57F287,
  error: 0xED4245,
  warning: 0xFEE75C,
  info: 0x5865F2,
  moderation: 0xFF6B6B,
  log: 0x2F3136,
};

function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function warnEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function modEmbed(action, user, moderator, reason, extra = {}) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.moderation)
    .setTitle(`🔨 ${action}`)
    .addFields(
      { name: 'User', value: `${user.tag || user} (${user.id || user})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag || moderator} (${moderator.id || moderator})`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false },
    )
    .setTimestamp();

  if (extra.duration) embed.addFields({ name: 'Duration', value: extra.duration, inline: true });
  if (extra.caseNumber) embed.setFooter({ text: `Case #${extra.caseNumber}` });
  if (user.displayAvatarURL) embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));

  return embed;
}

function logEmbed(title, description, color = COLORS.log) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = { successEmbed, errorEmbed, warnEmbed, infoEmbed, modEmbed, logEmbed, COLORS };
