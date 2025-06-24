const { Events } = require("discord.js");
const { get_server_data, parse, mute } = require("../lib/utils")

module.exports = {
  name: Events.MessageDelete,
  once: false,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const { num, userId, channelId, time, roleId } =
      get_server_data(message.guildId);

    if (num === null) {
      return;
    }

    if (message.channelId !== channelId) return;
    if (message.author.id != userId) return;
    
    let number = await parse(message.content);
    if (number != num) return;

    mute(message.member, time, roleId);

    message.channel.createWebhook({
        name: message.member.nickname ?? message.author.displayName,
	      avatar: message.author.displayAvatarURL(),
      })
	    .then(webhook =>
	      webhook.send(num)
      );
    }
}
