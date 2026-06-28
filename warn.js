const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning, getWarnings, removeWarning, clearWarnings, addCase, getGuildSettings, addPunishment } = require('../../utils/database');
const { sendLog, formatTimestamp, parseDuration } = require('../../utils/helpers');
const { successEmbed, errorEmbed, warnEmbed, infoEmbed, modEmbed, COLORS } = require('../../utils/embeds');
const { EmbedBuilder } = require('discord.js');

async function applyThreshold(interaction, target, settings, warnCount) {
  let thresholds = [];
  try { thresholds = JSON.parse(settings.warn_thresholds || '[]'); } catch {}
  const threshold = thresholds.find(t => t.count === warnCount);
  if (!threshold) return;

  const ms = threshold.duration ? parseDuration(threshold.duration) : null;
  const expiresAt = ms ? Math.floor((Date.now() + ms) / 1000) : null;

  try {
    if (threshold.action === 'kick') {
      await target.kick(`Reached ${warnCount} warnings`);
    } else if (threshold.action === 'ban') {
      await target.ban({ reason: `Reached ${warnCount} warnings` });
      if (ms) addPunishment(interaction.guild.id, target.id, interaction.client.user.id, 'ban', `${warnCount} warnings`, expiresAt);
    } else if (threshold.action === 'timeout') {
      if (ms) await target.timeout(ms, `Reached ${warnCount} warnings`);
    } else if (threshold.action === 'mute') {
      if (settings.mute_role) await target.roles.add(settings.mute_role, `Reached ${warnCount} warnings`);
      if (ms) addPunishment(interaction.guild.id, target.id, interaction.client.user.id, 'mute', `${warnCount} warnings`, expiresAt);
    }

    const embed = warnEmbed('Punishment Threshold Reached', `**${target.user.tag}** reached **${warnCount} warnings** and was automatically **${threshold.action}**ned.`);
    await sendLog(interaction.guild, embed, 'mod');
  } catch {}
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warning management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s => s.setName('add').setDescription('Warn a member')
      .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
      .addStringOption(o => o.setName('expires').setDescription('Warning expiry (e.g. 7d)')))
    .addSubcommand(s => s.setName('list').setDescription('View warnings for a user')
      .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a specific warning')
      .addIntegerOption(o => o.setName('id').setDescription('Warning ID').setRequired(true)))
    .addSubcommand(s => s.setName('clear').setDescription('Clear all warnings for a user')
      .addUserOption(o => o.setName('user').setDescription('User to clear').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason');
      const expires = interaction.options.getString('expires');
      const ms = expires ? parseDuration(expires) : null;
      const expiresAt = ms ? Math.floor((Date.now() + ms) / 1000) : null;

      if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found.')], ephemeral: true });

      addWarning(interaction.guild.id, target.id, interaction.user.id, reason, expiresAt);
      const { caseNumber } = addCase(interaction.guild.id, 'warn', target.id, interaction.user.id, reason, expiresAt);
      const warnings = getWarnings(interaction.guild.id, target.id);

      await target.send({ embeds: [warnEmbed(`Warned in ${interaction.guild.name}`, `**Reason:** ${reason}\n**Total Warnings:** ${warnings.length}`)] }).catch(() => {});

      const embed = modEmbed('Warning', target.user, interaction.user, reason, { caseNumber });
      embed.addFields({ name: 'Total Warnings', value: `${warnings.length}`, inline: true });
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');

      const settings = getGuildSettings(interaction.guild.id);
      await applyThreshold(interaction, target, settings, warnings.length);

    } else if (sub === 'list') {
      const user = interaction.options.getUser('user');
      const warnings = getWarnings(interaction.guild.id, user.id);

      if (!warnings.length) return interaction.reply({ embeds: [infoEmbed('No Warnings', `${user.tag} has no active warnings.`)], ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(`⚠️ Warnings — ${user.tag}`)
        .setDescription(warnings.map(w =>
          `**#${w.id}** — ${w.reason}\n*by <@${w.moderator_id}> • <t:${w.created_at}:R>*`
        ).join('\n\n').slice(0, 4000))
        .setFooter({ text: `${warnings.length} active warning(s)` })
        .setTimestamp();

      interaction.reply({ embeds: [embed] });

    } else if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const result = removeWarning(id, interaction.guild.id);
      if (!result.changes) return interaction.reply({ embeds: [errorEmbed('Not Found', `Warning #${id} not found.`)], ephemeral: true });
      interaction.reply({ embeds: [successEmbed('Warning Removed', `Warning **#${id}** has been removed.`)] });

    } else if (sub === 'clear') {
      const user = interaction.options.getUser('user');
      const result = clearWarnings(interaction.guild.id, user.id);
      interaction.reply({ embeds: [successEmbed('Warnings Cleared', `All warnings for **${user.tag}** have been cleared. (${result.changes} removed)`)] });
    }
  },
};
