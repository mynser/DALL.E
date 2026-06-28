const fs = require('fs');
const path = require('path');

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const raw = require(path.join(eventsPath, file));
    const events = Array.isArray(raw) ? raw : [raw];

    for (const event of events) {
      if (!event.name || !event.execute) continue;
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log(`✅ Loaded event: ${event.name}`);
    }
  }
}

module.exports = { loadEvents };
