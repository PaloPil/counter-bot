const fs = require("node:fs");

const guilds_dir = "guilds";

const calculate_url = "http://localhost:8080/calculate";

function suspect_input(str) {
  return (str.split("|").length > 100) || 
         (str.split("*").length > 100) ||
         (str.split("_").length > 100) ||
         (str.split("`").length > 100) ||
         (str.split("~").length > 100) ||
         (str.length > 1000);
}


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

async function parse(str) {
  if (suspect_input(str)) {
    console.log("===== SUSPECT INPUT DETECTED =====\n" +
                 str +
                "==================================");
    return NaN;
  }

  str = str.replace(/(\|\|.*?\|\|)/g, "");

  let data = undefined;

  try {
    const response = await fetch(calculate_url, {
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


module.exports = {
  mute,
  store_number,
  get_server_data,
  parse
}
