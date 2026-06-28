const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('📖 Command List')
      .setDescription('A professional moderation bot. Use `/settings` to configure everything.')
      .addFields(
        {
          name: '🔨 Moderation',
          value: '`/ban` `/kick` `/timeout` `/mute` `/unmute` `/softban` `/unban`\n`/warn add/list/remove/clear` `/jail add/remove`',
        },
        {
          name: '📢 Channel Control',
          value: '`/purge` `/lock channel/unlock` `/slowmode` `/nickname`',
        },
        {
          name: '📋 Lookup & Cases',
          value: '`/userinfo` `/case` `/history` `/note add/view`',
        },
        {
          name: '⚙️ Configuration',
          value: '`/settings view/log_channel/mod_log_channel/mute_role/jail_role/jail_channel/automod/bad_words/warn_threshold`',
        },
        {
          name: '🤖 AutoMod (auto-enforced)',
          value: 'Anti-Spam • Anti-Invite • Anti-Link • Anti-Caps • Anti-Zalgo\nAnti-Mention Spam • Bad Word Filter • Custom Regex',
        },
        {
          name: '📊 Logging (auto)',
          value: 'Message edits/deletes • Voice updates • Member join/leave • Role/nickname changes • Channel updates',
        },
      )
      .setFooter({ text: 'Use /settings to configure channels, roles, and automod' })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
