process.chdir(__dirname);

require("dotenv").config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN environment variable is required");
  process.exit(1);
}

const { Client, Collection, IntentsBitField } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { REST } = require("@discordjs/rest");
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

// Get application ID from token (more reliable than base64 decoding)
const getApplicationId = () => {
  try {
    const tokenParts = process.env.DISCORD_TOKEN.split(".");
    if (tokenParts.length !== 3) {
      throw new Error("Invalid token format");
    }
    return Buffer.from(tokenParts[0], "base64").toString("ascii");
  } catch (error) {
    console.error("Failed to extract application ID from token:", error.message);
    process.exit(1);
  }
};

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationCommands(getApplicationId()),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
})();


client.on("error", (error) => console.error("Discord client error:", error));
client.on("warn", (warning) => console.warn("Discord client warning:", warning));
client.once("disconnect", () => console.warn("Bot is disconnecting..."));
client.once("reconnecting", () => console.log("Bot reconnecting..."));

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
