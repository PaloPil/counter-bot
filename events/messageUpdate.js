const { Events } = require("discord.js");
const fs = require("node:fs");

function mute(member, time, roleId) {

  member.roles.add(roleId).then(() => {
    setTimeout(() => {
      member.roles.remove(roleId).catch(e => {
        console.error(`Failed to unmute ${member.user.tag}: ${e.message}`);
      });
    }, time * 60 * 1000);
  })
    .catch(e => {
      console.error(`Failed to mute ${member.user.tag}: ${e.message}`);
    });
}

function get_server_data(guildId) {
  const filePath = `${guilds_dir}/${guildId}.txt`;

  if (!fs.existsSync(filePath)) {
    return { num: null };
  }

  const data = fs.readFileSync(filePath, "utf-8").split("\n");

  const num = parseInt(data[0], 10);
  const userId = data[1];
  const channelId = data[2];
  const time = parseInt(data[3], 10);
  const roleId = data[4];
  const emoji = data[5].trim();

  return { num, userId, channelId, time, roleId, emoji };
}

async function parse(str) {
  if (suspect_input(str)) {
    console.log("===== SUSPECT INPUT DETECTED =====\n" +
                 str +
                "==================================");
    return NaN;
  }

  str = str.replace(/(\|\|.*?\|\|)/g, "");

  data = undefined;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        expression: str,
        variables: {}
      }),
      headers: {'Content-Type': 'application/json'}
    });
    data = await response.json();
  } catch (error) {
    console.error(error);
    return NaN;
  }

  if (data.error) {
    return NaN;
  }

  return data.result;
}

function suspect_input(str) {
  return (str.split("|").length > 100) || 
         (str.split("*").length > 100) ||
         (str.split("_").length > 100) ||
         (str.split("`").length > 100) ||
         (str.split("~").length > 100) ||
         (str.length > 1000);
}

module.exports = {
  name: Events.MessageUpdate,
  once: false,

  async execute(message, newMessage) {
    if (message.author.bot || !message.guild) return;

    const { num, userId, channelId, time, roleId, emoji } =
      get_server_data(message.guildId);

    if (num === null) {
      return;
    }

    if (message.channelId != channelId) return;
    if (message.author.id != userId) return;
    
    let number = await parse(message.content);
    if (number != num) return;

    let newNumber = await parse(newMessage.content);
    if (newNumber == number) return;

    mute(message.member, time, roleId);

    message.channel.createWebhook({
        name: message.member.nickname ?? message.author.displayName,
	      avatar: message.author.displayAvatarURL(),
      })
	    .then(webhook =>
	      webhook.send(num)
      );

      message.delete();
    }
}
