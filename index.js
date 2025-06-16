process.chdir(__dirname);

require("dotenv").config();
const { Client, Collection, IntentsBitField } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { REST } = require("@discordjs/rest");
const base64 = require("base-64");
const { Routes } = require("discord-api-types/v9");
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

module.exports.client = client;

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

const commands = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationCommands(
        base64.decode(process.env.DISCORD_TOKEN.split(".")[0])
      ),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();



client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.once("disconnect", () =>
  client.error("Bot is disconnecting...", "warn")
);
client.once("reconnecting", () => client.warn("Bot reconnecting...", "log"));

client.login(process.env.DISCORD_TOKEN);
