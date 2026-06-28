const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getWarnings, getCases, getNotes, addNote } = require('../../utils/database');
const { formatTimestamp, truncate } = require('../../utils/helpers');
const { infoEmbed, errorEmbed, successEmbed, COLORS } = require('../../utils/embeds');

// ─── Userinfo ─────────────────────────────────────────────────────────────────
const userinfo = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a user')
    .addUserOption(o => o.setName('user').setDescription('User to look up (defaults to yourself)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const warnings = getWarnings(interaction.guild.id, user.id);
    const cases = getCases(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`👤 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
      );

    if (member) {
      embed.addFields(
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Nickname', value: member.nickname || 'None', inline: true },
        { name: 'Top Role', value: member.roles.highest.toString(), inline: true },
        { name: 'Roles', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ').slice(0, 500) || 'None', inline: false },
      );
    }

    embed.addFields(
      { name: '⚠️ Warnings', value: `${warnings.length} active`, inline: true },
      { name: '📋 Total Cases', value: `${cases.length}`, inline: true },
    ).setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};

// ─── Case lookup ──────────────────────────────────────────────────────────────
const caseCmd = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Look up a moderation case')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(o => o.setName('number').setDescription('Case number').setRequired(true)),

  async execute(interaction) {
    const { getCase } = require('../../utils/database');
    const c = getCase(interaction.guild.id, interaction.options.getInteger('number'));
    if (!c) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Case not found.')], ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`📋 Case #${c.case_number} — ${c.type.toUpperCase()}`)
      .addFields(
        { name: 'User', value: `<@${c.user_id}> (${c.user_id})`, inline: true },
        { name: 'Moderator', value: `<@${c.moderator_id}>`, inline: true },
        { name: 'Date', value: `<t:${c.created_at}:F>`, inline: true },
        { name: 'Reason', value: c.reason, inline: false },
      )
      .setTimestamp();

    if (c.expires_at) embed.addFields({ name: 'Expires', value: `<t:${c.expires_at}:R>`, inline: true });
    if (c.evidence) embed.addFields({ name: 'Evidence', value: truncate(c.evidence), inline: false });

    interaction.reply({ embeds: [embed] });
  },
};

// ─── History ──────────────────────────────────────────────────────────────────
const history = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View moderation history for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const cases = getCases(interaction.guild.id, user.id);

    if (!cases.length) return interaction.reply({ embeds: [infoEmbed('No History', `${user.tag} has no moderation history.`)], ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(COLORS.moderation)
      .setTitle(`📋 Mod History — ${user.tag}`)
      .setDescription(cases.slice(0, 15).map(c =>
        `**Case #${c.case_number}** [${c.type.toUpperCase()}] <t:${c.created_at}:R>\n${c.reason.slice(0, 80)}`
      ).join('\n\n').slice(0, 4000))
      .setFooter({ text: `${cases.length} total case(s)` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};

// ─── Note ─────────────────────────────────────────────────────────────────────
const note = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add or view moderator notes for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s => s.setName('add').setDescription('Add a note')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('note').setDescription('Note content').setRequired(true)))
    .addSubcommand(s => s.setName('view').setDescription('View notes for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');

    if (sub === 'add') {
      const content = interaction.options.getString('note');
      addNote(interaction.guild.id, user.id, interaction.user.id, content);
      interaction.reply({ embeds: [successEmbed('Note Added', `Note added for **${user.tag}**.`)], ephemeral: true });
    } else {
      const notes = getNotes(interaction.guild.id, user.id);
      if (!notes.length) return interaction.reply({ embeds: [infoEmbed('No Notes', `No notes for ${user.tag}.`)], ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`📝 Notes — ${user.tag}`)
        .setDescription(notes.map(n =>
          `**#${n.id}** by <@${n.moderator_id}> <t:${n.created_at}:R>\n${n.note}`
        ).join('\n\n').slice(0, 4000))
        .setTimestamp();

      interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

module.exports = [userinfo, caseCmd, history, note];
