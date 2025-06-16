const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ChannelType, MessageFlags } = require("discord.js");
const fs = require("node:fs");

const guilds_dir = "guilds";


function assert(interaction, condition, message) {
  if (!condition) 
  {
    interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  return false;
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
          fr: "role_exlusion",
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
          fr: "temps_exlusion",
        })
        .setDescription(
          "The time in minutes for which a member will be timed out after an error. (default: 5)"
        )
        .setDescriptionLocalizations({
          fr: "Le temps en minutes pendant lequel un membre sera exclu après une erreur. (par défaut : 5)",
        })
        .setRequired(false)
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
    ),

  async execute(interaction) {
    console.log(`Commande '/${this.data.name}' reçue.`);

    const starting_number = interaction.options.getInteger("starting_number") || 0;
    const channel = interaction.options.getChannel("channel");
    const timeout_time = interaction.options.getInteger("timeout_time") || 5;
    const timeout_role = interaction.options.getRole("timeout_role");
    const emoji = interaction.options.getString("emoji") || "✅";

    if (
      assert(interaction, starting_number >= 0, "Le nombre de départ ne peut pas être négatif.") ||
      assert(interaction, 
        channel.type === ChannelType.GuildText || channel.type === ChannelType.PublicThread, 
        "Le salon doit être un salon textuel ou un fil public.") ||
      assert(interaction, timeout_time >= 0, "Le temps d'exclusion ne peut pas être négatif.")
    ) {
      return;
    }

    await interaction.deferReply();
    
    const filePath = `${guilds_dir}/${interaction.guildId}.txt`;
    if (!fs.existsSync(guilds_dir)) {
      fs.mkdirSync(guilds_dir, { recursive: true });
    }

    fs.writeFileSync(filePath, [
      starting_number.toString(),
      0, // Placeholder for the user ID, not used in this command
      channel.id,
      timeout_time.toString(),
      timeout_role.id,
      emoji.trim()
    ].join("\n"), "utf-8");


    // Log the configuration
    console.log(`Configuration saved for guild ${interaction.guildId}:`, {
      starting_number,
      channel: channel.id,
      timeout_time,
      timeout_role: timeout_role.id
    });

    await channel.send(starting_number.toString());

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Configuration du bot")
      .setDescription(
        `Le bot a été configuré avec les paramètres suivants :\n\n` +
        `**Nombre de départ :** ${starting_number}\n` +
        `**Salon :** ${channel}\n` +
        `**Temps d'exclusion :** ${timeout_time} minutes\n` +
        `**Rôle d'exclusion :** ${timeout_role}`
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  }

}