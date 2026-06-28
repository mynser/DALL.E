const { AuditLogEvent } = require('discord.js');
const { getGuildSettings } = require('../utils/database');
const { sendLog } = require('../utils/helpers');
const { logEmbed, COLORS } = require('../utils/embeds');

// Message Edit
module.exports = [
  {
    name: 'messageUpdate',
    async execute(oldMsg, newMsg, client) {
      if (!newMsg.guild || newMsg.author?.bot) return;
      if (oldMsg.content === newMsg.content) return;

      const embed = logEmbed('✏️ Message Edited', `**Author:** ${newMsg.author.tag} (${newMsg.author.id})\n**Channel:** ${newMsg.channel}\n**Before:** ${oldMsg.content?.slice(0, 500) || '[unknown]'}\n**After:** ${newMsg.content?.slice(0, 500) || '[empty]'}\n**[Jump to Message](${newMsg.url})**`, COLORS.info);
      await sendLog(newMsg.guild, embed, 'log');
    },
  },
  {
    name: 'messageDelete',
    async execute(msg, client) {
      if (!msg.guild || msg.author?.bot) return;

      const embed = logEmbed('🗑️ Message Deleted', `**Author:** ${msg.author?.tag || 'Unknown'} (${msg.author?.id || 'Unknown'})\n**Channel:** ${msg.channel}\n**Content:** ${msg.content?.slice(0, 800) || '[no content / embed]'}`, COLORS.error);
      await sendLog(msg.guild, embed, 'log');
    },
  },
  {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
      if (!newState.guild) return;
      const member = newState.member;
      let desc = '';

      if (!oldState.channelId && newState.channelId) {
        desc = `**${member.user.tag}** joined **${newState.channel.name}**`;
      } else if (oldState.channelId && !newState.channelId) {
        desc = `**${member.user.tag}** left **${oldState.channel.name}**`;
      } else if (oldState.channelId !== newState.channelId) {
        desc = `**${member.user.tag}** moved from **${oldState.channel.name}** → **${newState.channel.name}**`;
      } else {
        return;
      }

      const embed = logEmbed('🔊 Voice Update', desc, COLORS.info);
      await sendLog(newState.guild, embed, 'log');
    },
  },
  {
    name: 'guildMemberAdd',
    async execute(member, client) {
      const created = Math.floor(member.user.createdTimestamp / 1000);
      const embed = logEmbed('📥 Member Joined', `**User:** ${member.user.tag} (${member.id})\n**Account Created:** <t:${created}:R>\n**Member Count:** ${member.guild.memberCount}`, COLORS.success);
      await sendLog(member.guild, embed, 'log');
    },
  },
  {
    name: 'guildMemberRemove',
    async execute(member, client) {
      const embed = logEmbed('📤 Member Left', `**User:** ${member.user.tag} (${member.id})\n**Roles:** ${member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.toString()).join(', ') || 'None'}\n**Member Count:** ${member.guild.memberCount}`, COLORS.error);
      await sendLog(member.guild, embed, 'log');
    },
  },
  {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember, client) {
      if (!newMember.guild) return;

      // Nickname change
      if (oldMember.nickname !== newMember.nickname) {
        const embed = logEmbed('📝 Nickname Changed', `**User:** ${newMember.user.tag} (${newMember.id})\n**Before:** ${oldMember.nickname || 'None'}\n**After:** ${newMember.nickname || 'None'}`, COLORS.warning);
        await sendLog(newMember.guild, embed, 'log');
      }

      // Role updates
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
      if (addedRoles.size || removedRoles.size) {
        let desc = `**User:** ${newMember.user.tag} (${newMember.id})`;
        if (addedRoles.size) desc += `\n**Added:** ${addedRoles.map(r => r.toString()).join(', ')}`;
        if (removedRoles.size) desc += `\n**Removed:** ${removedRoles.map(r => r.toString()).join(', ')}`;
        const embed = logEmbed('🎭 Roles Updated', desc, COLORS.info);
        await sendLog(newMember.guild, embed, 'log');
      }
    },
  },
  {
    name: 'channelUpdate',
    async execute(oldChannel, newChannel, client) {
      if (!newChannel.guild) return;
      if (oldChannel.name === newChannel.name && oldChannel.topic === newChannel.topic) return;
      const embed = logEmbed('📢 Channel Updated', `**Channel:** ${newChannel.name} (${newChannel.id})\n**Name:** ${oldChannel.name} → ${newChannel.name}\n**Topic:** ${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}`, COLORS.info);
      await sendLog(newChannel.guild, embed, 'log');
    },
  },
  {
    name: 'channelDelete',
    async execute(channel, client) {
      if (!channel.guild) return;
      const embed = logEmbed('🔴 Channel Deleted', `**Name:** #${channel.name}\n**ID:** ${channel.id}\n**Type:** ${channel.type}`, COLORS.error);
      await sendLog(channel.guild, embed, 'log');
    },
  },
  {
    name: 'roleUpdate',
    async execute(oldRole, newRole, client) {
      const embed = logEmbed('🎭 Role Updated', `**Role:** ${newRole.name} (${newRole.id})\n**Name:** ${oldRole.name} → ${newRole.name}`, COLORS.info);
      await sendLog(newRole.guild, embed, 'log');
    },
  },
  {
    name: 'roleDelete',
    async execute(role, client) {
      const embed = logEmbed('🔴 Role Deleted', `**Name:** ${role.name}\n**ID:** ${role.id}`, COLORS.error);
      await sendLog(role.guild, embed, 'log');
    },
  },
];
