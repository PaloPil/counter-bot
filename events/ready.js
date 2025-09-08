const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {

    client.user.setPresence({
      activities: [{ name: "numbers", type: ActivityType.Watching }],
      status: "online",
    });

    console.log(`En ligne sur ${client.guilds.cache.size} serveur(s) en tant que @${client.user.tag} !`);
  },
};
