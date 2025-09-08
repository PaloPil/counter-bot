const { Events } = require("discord.js");
const { get_server_data, parse, mute } = require("../lib/utils");

module.exports = {
  name: Events.MessageDelete,
  once: false,

  async execute(message) {
    // Skip bots and DMs
    if (message.author.bot || !message.guild) return;

    const { num, userId, channelId, time, roleId } =
      get_server_data(message.guildId);

    // Skip if no configuration exists
    if (num === null) {
      return;
    }

    // Skip if not in the counting channel
    if (message.channelId !== channelId) return;

    // Only handle deletions by the user who sent the current number
    if (message.author.id !== userId) return;

    try {
      const number = await parse(message.content);

      // Only penalize if they deleted the current correct number
      if (number !== num) return;

      // Mute the user for deleting their correct number
      if (message.member) {
        mute(message.member, time, roleId);
      }

      // Restore the number using a webhook to maintain context
      try {
        const webhook = await message.channel.createWebhook({
          name: message.member?.nickname ?? message.author.displayName,
          avatar: message.author.displayAvatarURL(),
        });

        await webhook.send(num.toString());
        await webhook.delete();
      } catch (webhookError) {
        console.error("Failed to restore number via webhook:", webhookError.message);
        // Fallback: send message normally
        message.channel.send(num.toString()).catch(error => {
          console.error("Failed to restore number:", error.message);
        });
      }
    } catch (error) {
      console.error("Error handling message deletion:", error.message);
    }
  }
};
