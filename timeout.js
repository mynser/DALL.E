const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCase } = require('../../utils/database');
const { canModerate, parseDuration, formatDuration, sendLog } = require('../../utils/helpers');
const { errorEmbed, modEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member (Discord native timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d) max 28d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found.')], ephemeral: true });
    const check = canModerate(interaction, target);
    if (!check.ok) return interaction.reply({ embeds: [errorEmbed('Cannot Moderate', check.reason)], ephemeral: true });

    const ms = parseDuration(duration);
    if (!ms) return interaction.reply({ embeds: [errorEmbed('Invalid Duration', 'Use formats like `10m`, `1h`, `1d`.')], ephemeral: true });
    if (ms > 28 * 24 * 60 * 60 * 1000) return interaction.reply({ embeds: [errorEmbed('Too Long', 'Max timeout is 28 days.')], ephemeral: true });

    try {
      await target.timeout(ms, `${reason} | Moderator: ${interaction.user.tag}`);
      const { caseNumber } = addCase(interaction.guild.id, 'timeout', target.id, interaction.user.id, reason, Math.floor((Date.now() + ms) / 1000));
      const embed = modEmbed('Timeout', target.user, interaction.user, reason, { duration: formatDuration(ms), caseNumber });
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};
