const { ActivityType } = require(`discord.js`);
const { startOsuBot } = require(`../../utils/osu/ircBot.js`);
const { assignClient } = require("../../utils/components/matchmaking.js");

module.exports = {
    //'ready' event --
    //If there are no errors print to console... (Only checks on startup)
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Ready! ${client.user.tag} is online.`);

        client.user.setActivity({
            name: `RomAI Matches`,
            type: ActivityType.Playing
        });

        assignClient(client);
        startOsuBot(); // start irc client
    }
}