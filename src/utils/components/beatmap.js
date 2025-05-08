const { EmbedBuilder, bold, italic, strikethrough, underscore, spoiler, quote, blockQuote } = require('discord.js');
const { LegacyClient, isOsuJSError } = require('osu-web.js');
const { BeatmapCalculator } = require('@kionell/osu-pp-calculator');

const { osuAPI } = process.env;

const legacy = new LegacyClient(osuAPI);

module.exports = {
    async beatmapDetection(message) {
        var msg;
        var set;

        if (message.content.includes(" ")) {
            msg = message.content.split(" ");
            msg = msg[0].split("#osu/").pop();

            set = message.content.split(" ");
            set = set[0].split("#osu/");
            set = set[0].split("https://osu.ppy.sh/beatmapsets/").pop();
        } else {
            msg = message.content.split("#osu/").pop();

            set = message.content.split("#osu/");
            set = set[0].split("https://osu.ppy.sh/beatmapsets/").pop();
        }
        console.log(`Beatmap: ${msg}`);
        console.log(`Mapset: ${set}`);

        try {
            const beatmapSet = await legacy.getBeatmaps({
                b: msg
            });

            const beatmap = beatmapSet[0];

            var mapper = undefined;

            if (beatmap.creator_id) {
                mapper = await legacy.getUser({
                    u: beatmap.creator_id,
                    m: 'osu'
                });
            }

            const beatmapCalculator = new BeatmapCalculator();

            const pp = await beatmapCalculator.calculate({
                beatmapId: msg,
                accuracy: [97, 100],
            });

            var beatLength = Math.floor(beatmap.total_length / 60);
            beatLength = `${beatLength}:${beatmap.total_length - beatLength * 60}`;
            var hitLength = Math.floor(beatmap.hit_length / 60);
            hitLength = `${hitLength}:${beatmap.hit_length - hitLength * 60}`;
            var starRating = beatmap.difficultyrating.toFixed(2);

            var color = require(`../osu/difficultyColors.js`).colors(starRating);
            var embedColor = require(`../discord/codeColors.js`).hex(color);
            
            var performancePoints97 = pp.performance[0].totalPerformance.toFixed(0);
            var performancePoints = pp.performance[1].totalPerformance.toFixed(0);

            const mapEmbed = new EmbedBuilder()
                .setTitle(`${beatmap.artist} - ${beatmap.title}`)
                .setColor(embedColor)
                .setURL(`https://osu.ppy.sh/beatmapsets/${set}#osu/${msg}`)
                .setFooter({
                    text: `${beatmap.approved.toUpperCase()} | Last updated: ${beatmap.last_update}`
                })
                .setImage(`https://assets.ppy.sh/beatmaps/${set}/covers/cover.jpg`)
                .setDescription(`
                :${color}_circle: ${bold(starRating)} ★ ${bold("[" + beatmap.version + "]")}\n
                ${bold("Length:")} ${beatLength}(${hitLength}) | ${bold("BPM:")} ${beatmap.bpm} | ${bold("Max Combo:")} ${beatmap.max_combo}\n
                ${bold("AR:")} ${beatmap.diff_approach} | ${bold("OD:")} ${beatmap.diff_overall} | ${bold("HP:")} ${beatmap.diff_drain} | ${bold("CS:")} ${beatmap.diff_size}\n
                ${bold("PP for SS:")} ${performancePoints} | ${bold("PP for 97%:")} ${performancePoints97}
                `);

            if (mapper) {
                mapEmbed.setAuthor({
                    iconURL: `http://s.ppy.sh/a/${mapper.user_id}`,
                    url: `https://osu.ppy.sh/users/${mapper.user_id}`,
                    name: `Beatmap by ${mapper.username}`,
                });
            } else {
                mapEmbed.setAuthor({
                    name: `[userID not found]`
                });
            }

            const saveMap = require(`../osu/activeData.js`).saveBeatmap;

            saveMap(msg);

            await message.reply({
                embeds: [mapEmbed]
            });
        } catch (err) {
            if (isOsuJSError(err)) {
                // `err` is now of type `OsuJSError`
            
                if (err.type === 'invalid_json_syntax') {
                // `err` is now of type `OsuJSGeneralError`
                console.error('Error while parsing response as JSON');
                } else if (err.type === 'network_error') {
                // `err` is now of type `OsuJSGeneralError`
                console.error('Network error');
                } else if (err.type === 'unexpected_response') {
                // `err` is now of type `OsuJSUnexpectedResponseError`
            
                /**
                 * If using the fetch polyfill instead of the native fetch API, write:
                 * `err.response(true)`
                 * "true" means that it will return the Response type from "node-fetch" instead of the native Response
                 */
                const response = err.response(); // Type: `Response`
            
                console.error('Unexpected response');
                console.log(`Details: ${response.status} - ${response.statusText}`);
                console.log('JSON: ', await response.json());
                }
            }
            
            console.log(err);
            await message.reply({
                content: `There has been an error getting the beatmap.`
            });
        }
    }
};