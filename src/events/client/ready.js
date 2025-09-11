//const cron = require("node-cron");

const { ActivityType } = require(`discord.js`);
const { startOsuBot } = require(`../../utils/osu/ircBot.js`);
const { assignClient } = require("../../utils/components/matchmaking.js");
const { clearMatchLimitations } = require("../../utils/osu/activeData.js");

const seasons = require(`../../schemas/season.js`);
const { simulateSeasonReset } = require("../../utils/tests/updateDatabase.js");
const { checkSeasonReset } = require("../../utils/components/rankedLoop.js");

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

        /* --------------------- */
        // check for Season Reset
        /*
        function addMonths(date, months) {
            const result = new Date(date);
            result.setMonth(result.getMonth() + months);
            return result;
        }

        async function scheduleSeasonReset() {
            let season = await seasons.find();
            season = season ? season[season.length - 1] : undefined;

            const now = new Date();
            const nextSeason = season ? addMonths(season.startDate, 3) : undefined

            if (!nextSeason || now >= nextSeason) {
                // If we missed the reset due to downtime
                await checkSeasonReset();

                season = await seasons.find();
                season = season ? season[season.length - 1] : undefined;

                const newSeason = season ? addMonths(season.startDate, 3) : undefined;

                if (newSeason) {
                    const newDate = dateToCron(newSeason);

                    console.log("Scheduling reset with cron:", newDate);

                    cron.schedule(newDate, async () => {
                        await checkSeasonReset();
                    });
                }
            } else {
                // Schedule cron for that specific date/time
                const cronExpr = dateToCron(nextSeason);
                console.log("Scheduling reset with cron:", cronExpr);

                cron.schedule(cronExpr, async () => {
                    await checkSeasonReset();
                });
            }
        }

        function dateToCron(date) {
            const seconds = date.getSeconds();
            const minutes = date.getMinutes();
            const hours = date.getHours();
            const day = date.getDate();
            const month = date.getMonth() + 1; // cron months are 1-based
            return `${seconds} ${minutes} ${hours} ${day} ${month} *`;
        }
        */


        //scheduleSeasonReset();
        setInterval(clearMatchLimitations, 3600000);
    }
}