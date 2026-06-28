const { ActivityType } = require('discord.js');
const cron = require('node-cron');
const { getActivePunishments, expirePunishment } = require('../utils/database');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\n🤖 Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
    console.log(`👥 Watching ${client.users.cache.size} users\n`);

    client.user.setPresence({
      activities: [{ name: `${client.guilds.cache.size} servers | /help`, type: ActivityType.Watching }],
      status: 'online',
    });

    // ─── Expiry checker (runs every minute) ───────────────────────────────
    cron.schedule('* * * * *', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiring = getActivePunishments().filter(p => p.expires_at && p.expires_at <= now);

      for (const punishment of expiring) {
        try {
          const guild = client.guilds.cache.get(punishment.guild_id);
          if (!guild) { expirePunishment(punishment.id); continue; }

          if (punishment.type === 'ban') {
            await guild.members.unban(punishment.user_id, 'Temporary ban expired').catch(() => {});
          } else if (punishment.type === 'mute') {
            const member = await guild.members.fetch(punishment.user_id).catch(() => null);
            if (member) {
              const { getGuildSettings } = require('../utils/database');
              const settings = getGuildSettings(guild.id);
              if (settings.mute_role) {
                await member.roles.remove(settings.mute_role, 'Temporary mute expired').catch(() => {});
              }
            }
          } else if (punishment.type === 'timeout') {
            const member = await guild.members.fetch(punishment.user_id).catch(() => null);
            if (member) await member.timeout(null, 'Timeout expired').catch(() => {});
          } else if (punishment.type === 'jail') {
            const member = await guild.members.fetch(punishment.user_id).catch(() => null);
            if (member) {
              const { getGuildSettings } = require('../utils/database');
              const settings = getGuildSettings(guild.id);
              if (settings.jail_role) {
                await member.roles.remove(settings.jail_role, 'Temporary jail expired').catch(() => {});
              }
            }
          }

          expirePunishment(punishment.id);
        } catch (err) {
          console.error('Expiry error:', err);
        }
      }
    });
  },
};
