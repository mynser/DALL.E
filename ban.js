const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCase, addPunishment } = require('../../utils/database');
const { canModerate, parseDuration, formatDuration, sendLog } = require('../../utils/helpers');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban'))
    .addStringOption(o => o.setName('duration').setDescription('Temporary ban duration (e.g. 7d, 24h)'))
    .addIntegerOption(o => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const duration = interaction.options.getString('duration');
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found in this server.')], ephemeral: true });

    const check = canModerate(interaction, target);
    if (!check.ok) return interaction.reply({ embeds: [errorEmbed('Cannot Moderate', check.reason)], ephemeral: true });

    const ms = duration ? parseDuration(duration) : null;
    const expiresAt = ms ? Math.floor((Date.now() + ms) / 1000) : null;

    try {
      await target.send({ embeds: [errorEmbed(`Banned from ${interaction.guild.name}`, `**Reason:** ${reason}\n**Duration:** ${formatDuration(ms)}`)] }).catch(() => {});
      await target.ban({ reason: `${reason} | Moderator: ${interaction.user.tag}`, deleteMessageDays: deleteDays });

      const { caseNumber } = addCase(interaction.guild.id, 'ban', target.id, interaction.user.id, reason, expiresAt);
      if (ms) addPunishment(interaction.guild.id, target.id, interaction.user.id, 'ban', reason, expiresAt);

      const embed = modEmbed(ms ? 'Temporary Ban' : 'Ban', target.user, interaction.user, reason, { duration: formatDuration(ms), caseNumber });
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', `Could not ban this user: ${e.message}`)], ephemeral: true });
    }
  },
};
