const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ChannelType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("node:fs").promises;
const fsSync = require("node:fs");
const path = require("node:path");
const { clear_cache } = require("../lib/utils");

const guilds_dir = path.join(__dirname, "..", "guilds");

/**
 * Validates and replies with error if condition is false
 * @param {CommandInteraction} interaction - Discord interaction
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message to send
 * @returns {boolean} - True if condition failed (error occurred)
 */
function assert(interaction, condition, message) {
  if (!condition) {
    interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  return false;
}

/**
 * Validates emoji format (basic Unicode emoji or custom emoji)
 * @param {string} emoji - Emoji string to validate
 * @returns {boolean} - True if valid emoji format
 */
function isValidEmoji(emoji) {
  if (emoji.toLowerCase() === "no") return true;

  // Check for Unicode emoji (basic check)
  const unicodeEmojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]$/u;

  // Check for Discord custom emoji format <:name:id> or <a:name:id>
  const customEmojiRegex = /^<a?:\w+:\d+>$/;

  return unicodeEmojiRegex.test(emoji) || customEmojiRegex.test(emoji) || emoji.length === 1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setNameLocalizations({
      fr: "configuration",
    })
    .setDescription("Allows you to set up the bot for your server.")
    .setDescriptionLocalizations({
      fr: "Permet de configurer le bot pour votre serveur.",
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setNameLocalizations({
          fr: "salon",
        })
        .setDescription("The channel where the counting will take place.")
        .setDescriptionLocalizations({
          fr: "Le salon où le comptage aura lieu.",
        })
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread)
    )
    .addRoleOption((option) =>
      option
        .setName("timeout_role")
        .setNameLocalizations({
          fr: "role_exclusion",
        })
        .setDescription(
          "The role that will be assigned to a member when they are timed out."
        )
        .setDescriptionLocalizations({
          fr: "Le rôle qui sera attribué à un membre lorsqu'il sera exclu.",
        })
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("timeout_time")
        .setNameLocalizations({
          fr: "temps_exclusion",
        })
        .setDescription(
          "The time in minutes for which a member will be timed out after an error. (default: 5)"
        )
        .setDescriptionLocalizations({
          fr: "Le temps en minutes pendant lequel un membre sera exclu après une erreur. (par défaut : 5)",
        })
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(1440) // Max 24 hours
    )
    .addStringOption((option) =>
      option
        .setName("emoji")
        .setNameLocalizations({
          fr: "emoji",
        })
        .setDescription(
          "The emoji that will be used to react to the messages. \"no\" to disable reactions. (default: ✅)"
        )
        .setDescriptionLocalizations({
          fr: "L'emoji utilisé pour réagir aux messages. \"no\" pour aucune réaction. (par défaut : ✅)",
        })
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("starting_number")
        .setNameLocalizations({
          fr: "nombre_initial",
        })
        .setDescription("The number from which members will have to start counting. (default: 0)")
        .setDescriptionLocalizations({
          fr: "Le nombre à partir duquel les membres devront commencer à compter. (par défaut : 0)",
        })
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(1000000) // Reasonable upper limit
    ),

  async execute(interaction) {
    console.log(`Command '/${this.data.name}' received from user ${interaction.user.tag} in guild ${interaction.guildId}`);

    const starting_number = interaction.options.getInteger("starting_number") || 0;
    const channel = interaction.options.getChannel("channel");
    const timeout_time = interaction.options.getInteger("timeout_time") || 5;
    const timeout_role = interaction.options.getRole("timeout_role");
    const emoji = interaction.options.getString("emoji") || "✅";

    // Validation
    if (
      assert(interaction, starting_number >= 0, "The starting number cannot be negative.") ||
      assert(interaction,
        channel.type === ChannelType.GuildText || channel.type === ChannelType.PublicThread,
        "The channel must be a text channel or public thread.") ||
      assert(interaction, timeout_time >= 0 && timeout_time <= 1440, "The timeout time must be between 0 and 1440 minutes (24 hours).") ||
      assert(interaction, isValidEmoji(emoji), "Please provide a valid emoji or \"no\" to disable reactions.")
    ) {
      return;
    }

    await interaction.deferReply();

    try {
      // Ensure guilds directory exists
      if (!fsSync.existsSync(guilds_dir)) {
        await fs.mkdir(guilds_dir, { recursive: true });
      }

      const filePath = path.join(guilds_dir, `${interaction.guildId}.txt`);

      const configData = [
        starting_number.toString(),
        "0", // Placeholder for the user ID, not used in this command
        channel.id,
        timeout_time.toString(),
        timeout_role.id,
        emoji.trim()
      ].join("\n");

      await fs.writeFile(filePath, configData, "utf-8");

      // Clear cache for this guild
      clear_cache(interaction.guildId);

      // Log the configuration
      console.log(`Configuration saved for guild ${interaction.guildId}:`, {
        starting_number,
        channel: channel.id,
        timeout_time,
        timeout_role: timeout_role.id,
        emoji
      });

      // Send the starting number to the channel
      await channel.send(starting_number.toString());

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Bot Configuration")
        .setDescription(
          "The bot has been configured with the following parameters:\n\n" +
          `**Starting number:** ${starting_number}\n` +
          `**Channel:** ${channel}\n` +
          `**Timeout duration:** ${timeout_time} minutes\n` +
          `**Timeout role:** ${timeout_role}\n` +
          `**Emoji:** ${emoji !== "no" ? emoji : "*None*"}`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error during setup:", error.message);

      const errorMessage = "An error occurred while setting up the bot. Please try again.";

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};
