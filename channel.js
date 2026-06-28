const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../../utils/helpers');
const { successEmbed, errorEmbed, logEmbed, COLORS } = require('../../utils/embeds');

// ─── Purge ───────────────────────────────────────────────────────────────────
const purge = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in bulk')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user'))
    .addBooleanOption(o => o.setName('bots').setDescription('Only delete bot messages'))
    .addBooleanOption(o => o.setName('links').setDescription('Only delete messages with links'))
    .addBooleanOption(o => o.setName('attachments').setDescription('Only delete messages with attachments'))
    .addBooleanOption(o => o.setName('embeds').setDescription('Only delete messages with embeds')),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');
    const filterBots = interaction.options.getBoolean('bots');
    const filterLinks = interaction.options.getBoolean('links');
    const filterAttachments = interaction.options.getBoolean('attachments');
    const filterEmbeds = interaction.options.getBoolean('embeds');

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

      let filtered = [...messages.values()]
        .filter(m => m.createdTimestamp > twoWeeksAgo)
        .slice(0, amount);

      if (filterUser) filtered = filtered.filter(m => m.author.id === filterUser.id);
      if (filterBots) filtered = filtered.filter(m => m.author.bot);
      if (filterLinks) filtered = filtered.filter(m => /https?:\/\//.test(m.content));
      if (filterAttachments) filtered = filtered.filter(m => m.attachments.size > 0);
      if (filterEmbeds) filtered = filtered.filter(m => m.embeds.length > 0);

      if (!filtered.length) return interaction.editReply({ embeds: [errorEmbed('No Messages', 'No messages matched your filters.')] });

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      const embed = logEmbed('🗑️ Messages Purged', `**Channel:** ${interaction.channel}\n**Amount:** ${deleted.size}\n**Moderator:** ${interaction.user.tag}`, COLORS.warning);
      await sendLog(interaction.guild, embed, 'log');

      await interaction.editReply({ embeds: [successEmbed('Purge Complete', `Deleted **${deleted.size}** message(s).`)] });
    } catch (e) {
      interaction.editReply({ embeds: [errorEmbed('Failed', e.message)] });
    }
  },
};

// ─── Lock / Unlock ────────────────────────────────────────────────────────────
const lock = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock or unlock a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(s => s.setName('channel').setDescription('Lock a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (defaults to current)'))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('unlock').setDescription('Unlock a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock (defaults to current)'))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const everyoneRole = interaction.guild.roles.everyone;
      if (sub === 'channel') {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason });
        const embed = successEmbed('Channel Locked', `${channel} has been locked.\n**Reason:** ${reason}`);
        await interaction.reply({ embeds: [embed] });
        await channel.send({ embeds: [errorEmbed('🔒 Channel Locked', `This channel has been locked by ${interaction.user.tag}. Reason: ${reason}`)] }).catch(() => {});
      } else {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null }, { reason });
        const embed = successEmbed('Channel Unlocked', `${channel} has been unlocked.\n**Reason:** ${reason}`);
        await interaction.reply({ embeds: [embed] });
        await channel.send({ embeds: [successEmbed('🔓 Channel Unlocked', `This channel has been unlocked by ${interaction.user.tag}.`)] }).catch(() => {});
      }
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};

// ─── Slowmode ─────────────────────────────────────────────────────────────────
const slowmode = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds between messages (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)')),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);
      const msg = seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to **${seconds}s** in ${channel}.`;
      interaction.reply({ embeds: [successEmbed('Slowmode', msg)] });
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};

// ─── Nickname ─────────────────────────────────────────────────────────────────
const nickname = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Change or reset a member\'s nickname')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave blank to reset)')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const nick = interaction.options.getString('nickname') || null;

    if (!target) return interaction.reply({ embeds: [errorEmbed('Not Found', 'User not found.')], ephemeral: true });

    try {
      await target.setNickname(nick, `Changed by ${interaction.user.tag}`);
      interaction.reply({ embeds: [successEmbed('Nickname Updated', `**${target.user.tag}**'s nickname was ${nick ? `set to **${nick}**` : '**reset**'}.`)] });
    } catch (e) {
      interaction.reply({ embeds: [errorEmbed('Failed', e.message)], ephemeral: true });
    }
  },
};

module.exports = [purge, lock, slowmode, nickname];
