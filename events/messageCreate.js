const { Events, Embed } = require("discord.js");
const fs = require("node:fs");
const { client } = require("../index.js");

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
    return { num: null, userId: null, channelId: null, time: null, roleId: null }; 
  }

  const data = fs.readFileSync(filePath, "utf-8").split("\n");

  const num = parseInt(data[0], 10);
  const userId = data[1];
  const channelId = data[2];
  const time = parseInt(data[3], 10);
  const roleId = data[4];

  return { num, userId, channelId, time, roleId };
}

function parse(str) {
  str = str.replace(/(\|\|.*?\|\|)/g, "");

  try {
    number = eval(str);
  }
  catch (e) {
    return NaN;
  }

  return parseInt(number, 10);
}


module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const { num, userId, channelId, time, roleId } = get_server_data(message.guildId);

    if (num === null || userId === null || channelId === null || time === null || roleId === null) {
      return;
    }

    if (message.channelId != channelId) return;

    let number = parse(message.content);

    if (message.author.id != userId &&
        number != NaN && number == num + 1) {

      message.react("✅").catch(console.error);
      store_number(message.guildId, num + 1, message.author.id);
    
    } else {

      mute(message.member, time, roleId);
      message.delete();
    
    }
  },
};
