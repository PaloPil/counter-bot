const { Events } = require("discord.js");
const { get_server_data, parse, store_number, mute } = require("../lib/utils");

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    // Skip bots and DMs
    if (message.author.bot || !message.guild) return;

    const { num, userId, channelId, time, roleId, emoji } =
      get_server_data(message.guildId);

    // Skip if no configuration exists
    if (num === null) {
      return;
    }

    // Skip if not in the counting channel
    if (message.channelId !== channelId) return;

    try {
      const number = await parse(message.content);

      // Check if message contains a valid number and is correct
      const isValidNumber = !Number.isNaN(number) && Number.isFinite(number);
      const isCorrectNumber = isValidNumber && number === num + 1;
      const isDifferentUser = message.author.id !== userId;

      if (isDifferentUser && isCorrectNumber) {
        // Correct number from different user
        if (emoji.toLowerCase() !== "no") {
          message.react(emoji).catch(error => {
            console.error(`Failed to react with emoji ${emoji}:`, error.message);
          });
        }
        await store_number(message.guildId, num + 1, message.author.id);
      } else {
        // Wrong number, same user, or invalid input - mute and delete
        if (message.member) {
          mute(message.member, time, roleId);
        }
        message.delete().catch(error => {
          console.error("Failed to delete message:", error.message);
        });
      }
    } catch (error) {
      console.error("Error processing message in counting channel:", error.message);
    }
  },
};
