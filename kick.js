const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCase } = require('../../utils/database');
const { canModerate, sendLog } = require('../../utils/helpers');
const { errorEmbed, modEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found in this server.')], ephemeral: true });
    const check = canModerate(interaction, target);
    if (!check.ok) return interaction.reply({ embeds: [errorEmbed('Cannot Moderate', check.reason)], ephemeral: true });

    try {
      await target.send({ embeds: [errorEmbed(`Kicked from ${interaction.guild.name}`, `**Reason:** ${reason}`)] }).catch(() => {});
      await target.kick(`${reason} | Moderator: ${interaction.user.tag}`);
      const { caseNumber } = addCase(interaction.guild.id, 'kick', target.id, interaction.user.id, reason);
      const embed = modEmbed('Kick', target.user, interaction.user, reason, { caseNumber });
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};
