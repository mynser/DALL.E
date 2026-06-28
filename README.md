# 🤖 Professional Discord Moderation Bot — Phase 1

## ✅ Features Included
- Ban, Kick, Timeout, Mute/Unmute, Softban, Unban
- Warning system with history + auto-punishments at thresholds
- Jail system (with channel + role support)
- Purge with filters (user, bots, links, attachments, embeds)
- Lock/Unlock channels, Slowmode, Nickname management
- AutoMod: Anti-Spam, Anti-Invite, Anti-Link, Anti-Caps, Anti-Zalgo, Anti-Mention Spam, Bad Word Filter, Custom Regex
- Full logging: message edits/deletes, voice, members, roles, nicknames, channels
- Case system with full history
- User notes for moderators
- Settings panel with `/settings`
- Temporary punishments with auto-expiry

---

## 🚀 Setup Guide (No Downloads Required)

### Step 1 — Create your Discord Bot
1. Go to https://discord.com/developers/applications
2. Click **New Application**, name it
3. Go to **Bot** tab → **Reset Token** → copy the token
4. Enable all **Privileged Gateway Intents** (Presence, Server Members, Message Content)
5. Go to **OAuth2 → URL Generator** → check `bot` + `applications.commands`
6. Permissions: `Administrator` (or manually select what you need)
7. Copy the generated URL and invite the bot to your server

### Step 2 — Push to GitHub
1. Go to https://github.com → create a new **private** repository
2. Upload all these files to the repo (drag and drop)

### Step 3 — Deploy on Railway
1. Go to https://railway.app → sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your repository
4. Go to **Variables** tab, add:
   - `BOT_TOKEN` = your bot token from Step 1
   - `CLIENT_ID` = your application ID (from Developer Portal → General Information)
5. Railway auto-deploys — your bot is live 24/7!

---

## ⚙️ First-Time Bot Setup (in Discord)

After the bot is running, use these slash commands to configure it:

```
/settings log_channel #your-log-channel
/settings mod_log_channel #your-mod-log-channel
/settings mute_role @Muted
/settings jail_role @Jailed
/settings jail_channel #jail

# Set auto-punishments (optional)
/settings warn_threshold count:3 action:timeout duration:1h
/settings warn_threshold count:5 action:kick
/settings warn_threshold count:7 action:ban

# Toggle automod features
/settings automod feature:anti_spam enabled:true
/settings automod feature:anti_invite enabled:true
```

---

## 📋 Phase 2 (Coming Next)
- Tickets system with panels, transcripts, ratings
- Applications/forms
- Reaction roles, button roles, select menu roles
- Welcome/goodbye/boost messages
- Polls, giveaways, suggestions
- AFK system
- Server stats channels
