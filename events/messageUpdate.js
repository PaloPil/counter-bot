const { Events } = require("discord.js");
const { get_server_data, parse, mute } = require("../lib/utils");

module.exports = {
  name: Events.MessageUpdate,
  once: false,

  async execute(oldMessage, newMessage) {
    // Skip bots and DMs
    if (oldMessage.author.bot || !oldMessage.guild) return;

    const { num, userId, channelId, time, roleId } =
      get_server_data(oldMessage.guildId);

    // Skip if no configuration exists
    if (num === null) {
      return;
    }

    // Skip if not in the counting channel
    if (oldMessage.channelId !== channelId) return;

    // Only handle edits by the user who sent the current number
    if (oldMessage.author.id !== userId) return;

    try {
      const oldNumber = await parse(oldMessage.content);

      // Only care about edits to the current correct number
      if (oldNumber !== num) return;

      const newNumber = await parse(newMessage.content);

      // If the number didn't actually change, allow it
      if (newNumber === oldNumber) return;

      // User edited their correct number to something else - penalize them
      if (oldMessage.member) {
        mute(oldMessage.member, time, roleId);
      }

      // Delete the edited message and restore the original number
      newMessage.delete().catch(error => {
        console.error("Failed to delete edited message:", error.message);
      });

      // Restore the original number using a webhook
      try {
        const webhook = await oldMessage.channel.createWebhook({
          name: oldMessage.member?.nickname ?? oldMessage.author.displayName,
          avatar: oldMessage.author.displayAvatarURL(),
        });

        await webhook.send(num.toString());
        await webhook.delete();
      } catch (webhookError) {
        console.error("Failed to restore number via webhook:", webhookError.message);
        // Fallback: send message normally
        oldMessage.channel.send(num.toString()).catch(error => {
          console.error("Failed to restore number:", error.message);
        });
      }
    } catch (error) {
      console.error("Error handling message update:", error.message);
    }
  }
};
