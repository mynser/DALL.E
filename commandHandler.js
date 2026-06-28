const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function loadCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');

  function readCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        readCommands(fullPath);
      } else if (file.endsWith('.js')) {
        const raw = require(fullPath);
        const items = Array.isArray(raw) ? raw : [raw];
        for (const command of items) {
          if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
          }
        }
      }
    }
  }

  readCommands(commandsPath);

  const rest = new REST().setToken(process.env.BOT_TOKEN);
  try {
    console.log(`🔄 Refreshing ${commands.length} application commands...`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log(`✅ Loaded ${commands.length} commands`);
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
}

module.exports = { loadCommands };
