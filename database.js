const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDatabase() {
  db = new Database(path.join(__dirname, '../data/bot.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      expires_at INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS punishments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      expires_at INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      log_channel TEXT,
      mod_log_channel TEXT,
      mute_role TEXT,
      jail_role TEXT,
      jail_channel TEXT,
      automod_enabled INTEGER DEFAULT 1,
      anti_spam INTEGER DEFAULT 1,
      anti_invite INTEGER DEFAULT 1,
      anti_link INTEGER DEFAULT 0,
      anti_mention_spam INTEGER DEFAULT 1,
      anti_caps INTEGER DEFAULT 1,
      anti_zalgo INTEGER DEFAULT 1,
      anti_raid INTEGER DEFAULT 1,
      bad_words TEXT DEFAULT '[]',
      custom_regex TEXT DEFAULT '[]',
      warn_thresholds TEXT DEFAULT '[]',
      trusted_roles TEXT DEFAULT '[]',
      immune_roles TEXT DEFAULT '[]',
      link_whitelist TEXT DEFAULT '[]',
      max_mentions INTEGER DEFAULT 5,
      max_emojis INTEGER DEFAULT 10,
      raid_threshold INTEGER DEFAULT 10,
      raid_action TEXT DEFAULT 'kick'
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      case_number INTEGER NOT NULL,
      type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      expires_at INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS automod_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      action TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  console.log('✅ Database initialized');
  return db;
}

function getDb() {
  return db;
}

// ─── Warning helpers ────────────────────────────────────────────────────────

function addWarning(guildId, userId, moderatorId, reason, expiresAt = null) {
  const stmt = db.prepare(`
    INSERT INTO warnings (guild_id, user_id, moderator_id, reason, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(guildId, userId, moderatorId, reason, expiresAt);
}

function getWarnings(guildId, userId) {
  return db.prepare(`
    SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? AND active = 1
    ORDER BY created_at DESC
  `).all(guildId, userId);
}

function removeWarning(warningId, guildId) {
  return db.prepare(`
    UPDATE warnings SET active = 0 WHERE id = ? AND guild_id = ?
  `).run(warningId, guildId);
}

function clearWarnings(guildId, userId) {
  return db.prepare(`
    UPDATE warnings SET active = 0 WHERE guild_id = ? AND user_id = ?
  `).run(guildId, userId);
}

// ─── Case helpers ────────────────────────────────────────────────────────────

function addCase(guildId, type, userId, moderatorId, reason, expiresAt = null, evidence = null) {
  const lastCase = db.prepare(`
    SELECT MAX(case_number) as max FROM cases WHERE guild_id = ?
  `).get(guildId);
  const caseNumber = (lastCase?.max || 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO cases (guild_id, case_number, type, user_id, moderator_id, reason, expires_at, evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, caseNumber, type, userId, moderatorId, reason, expiresAt, evidence);

  return { ...stmt, caseNumber };
}

function getCase(guildId, caseNumber) {
  return db.prepare(`SELECT * FROM cases WHERE guild_id = ? AND case_number = ?`).get(guildId, caseNumber);
}

function getCases(guildId, userId) {
  return db.prepare(`SELECT * FROM cases WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC`).all(guildId, userId);
}

// ─── Guild settings helpers ──────────────────────────────────────────────────

function getGuildSettings(guildId) {
  let settings = db.prepare(`SELECT * FROM guild_settings WHERE guild_id = ?`).get(guildId);
  if (!settings) {
    db.prepare(`INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)`).run(guildId);
    settings = db.prepare(`SELECT * FROM guild_settings WHERE guild_id = ?`).get(guildId);
  }
  return settings;
}

function updateGuildSetting(guildId, key, value) {
  db.prepare(`INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)`).run(guildId);
  return db.prepare(`UPDATE guild_settings SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
}

// ─── Notes helpers ───────────────────────────────────────────────────────────

function addNote(guildId, userId, moderatorId, note) {
  return db.prepare(`
    INSERT INTO user_notes (guild_id, user_id, moderator_id, note) VALUES (?, ?, ?, ?)
  `).run(guildId, userId, moderatorId, note);
}

function getNotes(guildId, userId) {
  return db.prepare(`SELECT * FROM user_notes WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC`).all(guildId, userId);
}

// ─── Punishment helpers ──────────────────────────────────────────────────────

function addPunishment(guildId, userId, moderatorId, type, reason, expiresAt = null) {
  return db.prepare(`
    INSERT INTO punishments (guild_id, user_id, moderator_id, type, reason, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, moderatorId, type, reason, expiresAt);
}

function getActivePunishments(type = null) {
  if (type) {
    return db.prepare(`SELECT * FROM punishments WHERE type = ? AND active = 1 AND expires_at IS NOT NULL`).all(type);
  }
  return db.prepare(`SELECT * FROM punishments WHERE active = 1 AND expires_at IS NOT NULL`).all();
}

function expirePunishment(id) {
  return db.prepare(`UPDATE punishments SET active = 0 WHERE id = ?`).run(id);
}

module.exports = {
  initDatabase, getDb,
  addWarning, getWarnings, removeWarning, clearWarnings,
  addCase, getCase, getCases,
  getGuildSettings, updateGuildSetting,
  addNote, getNotes,
  addPunishment, getActivePunishments, expirePunishment,
};
