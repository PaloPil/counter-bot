const { Events } = require("discord.js");
const fs = require("node:fs");


const guilds_dir = "guilds";

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

function store_number(guildId, num, userId) {
  const filePath = `${guilds_dir}/${guildId}.txt`;

  if (!fs.existsSync(filePath)) return;

  const data = fs.readFileSync(filePath, "utf-8").split("\n");

  data[0] = num.toString();
  data[1] = userId;

  fs.writeFileSync(filePath, data.join("\n"));
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

function parse(str) {
  str = str.replace(/(\|\|.*?\|\|)/g, "");

  number = str
  while (typeof number !== 'number') {
    try {
      number = eval(number);
    } catch (e) {
      return NaN;
    }
  }

  return number;
}


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

    let number = parse(message.content);

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
