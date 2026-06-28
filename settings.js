const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildSettings, updateGuildSetting } = require('../../utils/database');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('view').setDescription('View current settings'))
    .addSubcommand(s => s.setName('log_channel').setDescription('Set the general log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))
    .addSubcommand(s => s.setName('mod_log_channel').setDescription('Set the moderation log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Mod log channel').setRequired(true)))
    .addSubcommand(s => s.setName('mute_role').setDescription('Set the mute role')
      .addRoleOption(o => o.setName('role').setDescription('Mute role').setRequired(true)))
    .addSubcommand(s => s.setName('jail_role').setDescription('Set the jail role')
      .addRoleOption(o => o.setName('role').setDescription('Jail role').setRequired(true)))
    .addSubcommand(s => s.setName('jail_channel').setDescription('Set the jail channel')
      .addChannelOption(o => o.setName('channel').setDescription('Jail channel').setRequired(true)))
    .addSubcommand(s => s.setName('automod').setDescription('Toggle automod features')
      .addStringOption(o => o.setName('feature').setDescription('Feature to toggle').setRequired(true)
        .addChoices(
          { name: 'Anti Spam', value: 'anti_spam' },
          { name: 'Anti Invite', value: 'anti_invite' },
          { name: 'Anti Link', value: 'anti_link' },
          { name: 'Anti Mention Spam', value: 'anti_mention_spam' },
          { name: 'Anti Caps', value: 'anti_caps' },
          { name: 'Anti Zalgo', value: 'anti_zalgo' },
          { name: 'Anti Raid', value: 'anti_raid' },
          { name: 'All AutoMod', value: 'automod_enabled' },
        ))
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(s => s.setName('bad_words').setDescription('Add or remove a bad word')
      .addStringOption(o => o.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }, { name: 'List', value: 'list' }))
      .addStringOption(o => o.setName('word').setDescription('The word')))
    .addSubcommand(s => s.setName('warn_threshold').setDescription('Set auto-punishment at X warnings')
      .addIntegerOption(o => o.setName('count').setDescription('Warning count').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Action to take').setRequired(true)
        .addChoices(
          { name: 'Kick', value: 'kick' },
          { name: 'Ban', value: 'ban' },
          { name: 'Timeout', value: 'timeout' },
          { name: 'Mute', value: 'mute' },
          { name: 'Remove', value: 'remove' },
        ))
      .addStringOption(o => o.setName('duration').setDescription('Duration for temp punishments (e.g. 1h)'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = getGuildSettings(interaction.guild.id);

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('⚙️ Bot Settings')
        .addFields(
          { name: '📋 Channels', value: `Log: ${settings.log_channel ? `<#${settings.log_channel}>` : 'Not set'}\nMod Log: ${settings.mod_log_channel ? `<#${settings.mod_log_channel}>` : 'Not set'}\nJail: ${settings.jail_channel ? `<#${settings.jail_channel}>` : 'Not set'}`, inline: true },
          { name: '🎭 Roles', value: `Mute: ${settings.mute_role ? `<@&${settings.mute_role}>` : 'Not set'}\nJail: ${settings.jail_role ? `<@&${settings.jail_role}>` : 'Not set'}`, inline: true },
          { name: '🤖 AutoMod', value: `AutoMod: ${settings.automod_enabled ? '✅' : '❌'}\nAnti-Spam: ${settings.anti_spam ? '✅' : '❌'}\nAnti-Invite: ${settings.anti_invite ? '✅' : '❌'}\nAnti-Link: ${settings.anti_link ? '✅' : '❌'}\nAnti-Caps: ${settings.anti_caps ? '✅' : '❌'}\nAnti-Zalgo: ${settings.anti_zalgo ? '✅' : '❌'}\nAnti-Raid: ${settings.anti_raid ? '✅' : '❌'}`, inline: true },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'log_channel') {
      const ch = interaction.options.getChannel('channel');
      updateGuildSetting(interaction.guild.id, 'log_channel', ch.id);
      return interaction.reply({ embeds: [successEmbed('Updated', `Log channel set to ${ch}.`)], ephemeral: true });
    }

    if (sub === 'mod_log_channel') {
      const ch = interaction.options.getChannel('channel');
      updateGuildSetting(interaction.guild.id, 'mod_log_channel', ch.id);
      return interaction.reply({ embeds: [successEmbed('Updated', `Mod log channel set to ${ch}.`)], ephemeral: true });
    }

    if (sub === 'mute_role') {
      const role = interaction.options.getRole('role');
      updateGuildSetting(interaction.guild.id, 'mute_role', role.id);
      return interaction.reply({ embeds: [successEmbed('Updated', `Mute role set to ${role}.`)], ephemeral: true });
    }

    if (sub === 'jail_role') {
      const role = interaction.options.getRole('role');
      updateGuildSetting(interaction.guild.id, 'jail_role', role.id);
      return interaction.reply({ embeds: [successEmbed('Updated', `Jail role set to ${role}.`)], ephemeral: true });
    }

    if (sub === 'jail_channel') {
      const ch = interaction.options.getChannel('channel');
      updateGuildSetting(interaction.guild.id, 'jail_channel', ch.id);
      return interaction.reply({ embeds: [successEmbed('Updated', `Jail channel set to ${ch}.`)], ephemeral: true });
    }

    if (sub === 'automod') {
      const feature = interaction.options.getString('feature');
      const enabled = interaction.options.getBoolean('enabled');
      updateGuildSetting(interaction.guild.id, feature, enabled ? 1 : 0);
      return interaction.reply({ embeds: [successEmbed('AutoMod Updated', `**${feature}** has been ${enabled ? 'enabled ✅' : 'disabled ❌'}.`)], ephemeral: true });
    }

    if (sub === 'bad_words') {
      const action = interaction.options.getString('action');
      const word = interaction.options.getString('word');
      let words = [];
      try { words = JSON.parse(settings.bad_words || '[]'); } catch {}

      if (action === 'list') {
        return interaction.reply({ embeds: [infoEmbed('Bad Words', words.length ? `\`${words.join('`, `')}\`` : 'No words configured.')], ephemeral: true });
      }
      if (!word) return interaction.reply({ embeds: [errorEmbed('Missing Word', 'Please provide a word.')], ephemeral: true });

      if (action === 'add') {
        if (!words.includes(word.toLowerCase())) words.push(word.toLowerCase());
      } else {
        words = words.filter(w => w !== word.toLowerCase());
      }

      updateGuildSetting(interaction.guild.id, 'bad_words', JSON.stringify(words));
      return interaction.reply({ embeds: [successEmbed('Bad Words Updated', `Word \`${word}\` ${action === 'add' ? 'added to' : 'removed from'} the filter.`)], ephemeral: true });
    }

    if (sub === 'warn_threshold') {
      const count = interaction.options.getInteger('count');
      const action = interaction.options.getString('action');
      const duration = interaction.options.getString('duration');
      let thresholds = [];
      try { thresholds = JSON.parse(settings.warn_thresholds || '[]'); } catch {}

      thresholds = thresholds.filter(t => t.count !== count);

      if (action !== 'remove') {
        thresholds.push({ count, action, duration });
      }

      updateGuildSetting(interaction.guild.id, 'warn_thresholds', JSON.stringify(thresholds));
      const msg = action === 'remove'
        ? `Threshold at **${count}** warnings removed.`
        : `At **${count}** warnings: **${action}**${duration ? ` for ${duration}` : ''}.`;
      return interaction.reply({ embeds: [successEmbed('Threshold Updated', msg)], ephemeral: true });
    }
  },
};
