const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCase, addPunishment, getGuildSettings } = require('../../utils/database');
const { canModerate, parseDuration, formatDuration, sendLog } = require('../../utils/helpers');
const { errorEmbed, successEmbed, modEmbed } = require('../../utils/embeds');

// ─── Mute ────────────────────────────────────────────────────────────────────
const mute = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member using the mute role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 1h, 7d)')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const duration = interaction.options.getString('duration');
    const settings = getGuildSettings(interaction.guild.id);

    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found.')], ephemeral: true });
    if (!settings.mute_role) return interaction.reply({ embeds: [errorEmbed('Not Configured', 'No mute role set. Use `/settings mute_role` to configure.')], ephemeral: true });

    const check = canModerate(interaction, target);
    if (!check.ok) return interaction.reply({ embeds: [errorEmbed('Cannot Moderate', check.reason)], ephemeral: true });

    const ms = duration ? parseDuration(duration) : null;
    const expiresAt = ms ? Math.floor((Date.now() + ms) / 1000) : null;

    try {
      await target.roles.add(settings.mute_role, `${reason} | ${interaction.user.tag}`);
      addCase(interaction.guild.id, 'mute', target.id, interaction.user.id, reason, expiresAt);
      if (ms) addPunishment(interaction.guild.id, target.id, interaction.user.id, 'mute', reason, expiresAt);
      const embed = modEmbed('Mute', target.user, interaction.user, reason, { duration: formatDuration(ms) });
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};

// ─── Unmute ──────────────────────────────────────────────────────────────────
const unmute = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('User to unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const settings = getGuildSettings(interaction.guild.id);

    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found.')], ephemeral: true });
    if (!settings.mute_role) return interaction.reply({ embeds: [errorEmbed('Not Configured', 'No mute role configured.')], ephemeral: true });

    try {
      await target.roles.remove(settings.mute_role, `${reason} | ${interaction.user.tag}`);
      const embed = modEmbed('Unmute', target.user, interaction.user, reason);
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};

// ─── Softban ─────────────────────────────────────────────────────────────────
const softban = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban to delete messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('User to softban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .addIntegerOption(o => o.setName('delete_days').setDescription('Days of messages to delete').setMinValue(1).setMaxValue(7)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 7;
    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found.')], ephemeral: true });
    const check = canModerate(interaction, target);
    if (!check.ok) return interaction.reply({ embeds: [errorEmbed('Cannot Moderate', check.reason)], ephemeral: true });

    try {
      await target.ban({ reason: `Softban: ${reason}`, deleteMessageDays: deleteDays });
      await interaction.guild.members.unban(target.id, 'Softban complete');
      addCase(interaction.guild.id, 'softban', target.id, interaction.user.id, reason);
      const embed = modEmbed('Softban', target.user, interaction.user, reason);
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};

// ─── Unban ───────────────────────────────────────────────────────────────────
const unban = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    try {
      const user = await interaction.client.users.fetch(userId);
      await interaction.guild.members.unban(userId, `${reason} | ${interaction.user.tag}`);
      addCase(interaction.guild.id, 'unban', userId, interaction.user.id, reason);
      const embed = modEmbed('Unban', user, interaction.user, reason);
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, embed, 'mod');
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};

// ─── Jail ─────────────────────────────────────────────────────────────────────
const jail = {
  data: new SlashCommandBuilder()
    .setName('jail')
    .setDescription('Jail or unjail a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s => s.setName('add').setDescription('Jail a member')
      .addUserOption(o => o.setName('user').setDescription('User to jail').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .addStringOption(o => o.setName('duration').setDescription('Duration')))
    .addSubcommand(s => s.setName('remove').setDescription('Release a member from jail')
      .addUserOption(o => o.setName('user').setDescription('User to unjail').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const settings = getGuildSettings(interaction.guild.id);

    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found.')], ephemeral: true });
    if (!settings.jail_role) return interaction.reply({ embeds: [errorEmbed('Not Configured', 'No jail role set. Use `/settings jail_role`.')], ephemeral: true });

    if (sub === 'add') {
      const duration = interaction.options.getString('duration');
      const ms = duration ? parseDuration(duration) : null;
      const expiresAt = ms ? Math.floor((Date.now() + ms) / 1000) : null;

      try {
        await target.roles.add(settings.jail_role, `${reason} | ${interaction.user.tag}`);
        if (settings.jail_channel) {
          const ch = interaction.guild.channels.cache.get(settings.jail_channel);
          if (ch) ch.send({ content: `${target} You have been jailed. Reason: **${reason}**` }).catch(() => {});
        }
        addCase(interaction.guild.id, 'jail', target.id, interaction.user.id, reason, expiresAt);
        if (ms) addPunishment(interaction.guild.id, target.id, interaction.user.id, 'jail', reason, expiresAt);
        const embed = modEmbed('Jail', target.user, interaction.user, reason, { duration: formatDuration(ms) });
        await interaction.reply({ embeds: [embed] });
        await sendLog(interaction.guild, embed, 'mod');
      } catch (e) {
        interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
      }
    } else {
      try {
        await target.roles.remove(settings.jail_role, `Released | ${interaction.user.tag}`);
        const embed = modEmbed('Released from Jail', target.user, interaction.user, 'Released by moderator');
        await interaction.reply({ embeds: [embed] });
        await sendLog(interaction.guild, embed, 'mod');
      } catch (e) {
        interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
      }
    }
  },
};

module.exports = [mute, unmute, softban, unban, jail];
