const { Events } = require("discord.js");
const { get_server_data, parse, store_number, mute } = require("../lib/utils")

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const { num, userId, channelId, time, roleId, emoji } =
      get_server_data(message.guildId);

    if (num === null) {
      return;
    }

    if (message.channelId != channelId) return;

    let number = await parse(message.content);

    if (message.author.id != userId &&
      number != NaN && number == num + 1) {
      if (emoji.toLowerCase() != "no") {
        message.react(emoji).catch(console.error);
      }
      store_number(message.guildId, num + 1, message.author.id);

    } else {

      mute(message.member, time, roleId);
      message.delete();

    }
  },
};
