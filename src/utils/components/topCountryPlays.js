const { EmbedBuilder, bold, italic, strikethrough, spoiler, quote, blockQuote, inlineCode , codeBlock, underline, hyperlink } = require('discord.js');
const { isOsuJSError, Auth, Client } = require('osu-web.js');
const { dateConversion } = require('../osu/formatNum');
const { osuRanksAsEmojis } = require('../discord/getEmojis');
const { loadingMessage } = require('../discord/loading');

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async getTopPlaysByCountry(interaction, client, countryCode) {
        try {   
            const token = await auth.clientCredentialsGrant();
            const api = new Client(token.access_token);

            const tasks = [
                'Getting Top Plays', 'Calculating Scores'
            ];

            let taskName = `Loading ${countryCode} Top Plays`;
            const loading = await loadingMessage(taskName, tasks);

            replying(loading().changeState(0, 'executing'));

            console.log(`Getting ${countryCode} users...`);

            const topUsers = await api.ranking.getRanking('osu', 'performance', {
                query: {
                  country: countryCode
                }
            });

            const playerLimit = 15;
            let topPlays = [];

            console.log(`Found: ${topUsers.total} total users`);

            let cooldown = new Date();

            for (let i=0; i<topUsers.ranking.length; i++) {
                // Limit to playerLimit top players
                if (i == playerLimit) break;

                let user = topUsers.ranking[i];

                console.log(`Calculating (${i + 1}/${playerLimit}): ${user.user.username} `);

                // Limit to 10 top plays per player
                const userBest = await api.users.getUserScores(user.user.id, 'best', {
                    query: {
                        mode: 'osu',
                        limit: 10
                    }
                });

                topPlays = topPlays.concat(userBest);

                let interval = new Date();
                if ((interval - cooldown) / 1000 > 3) {
                    cooldown = interval;

                    let maxValue = topUsers.ranking.length;
                    let percentage = Math.floor((i / maxValue) * 100);

                    replying(loading().changeState(0, 'executing', percentage));
                }
            }

            replying(loading().changeState(1, 'executing'));
            cooldown = new Date();

            console.log(`Sorting and creating embed`);

            topPlays.sort((a, b) => b.pp - a.pp);

            const topEmbed = new EmbedBuilder()
                .setTitle(`Top 10 Plays`)
                .setAuthor({
                    name: `Top Plays of ${countryCode}`,
                    iconURL: `https://assets.ppy.sh/old-flags/${countryCode}.png`
                })
                .setThumbnail(`${topPlays[0].user.avatar_url}`);

            console.log(`Inserting top play information...`);

            for (let i=0; i<topPlays.length; i++) {
                // Limit to 10 top country plays
                if (i == 10) break; 

                let play = topPlays[i];

                console.log(`Play ${i + 1}: ${play.user.username} - ${play.pp}`);

                let index = i == 0 ? `${`PP Record`}:` : `${`${i + 1}.`}`;
                let acc = `${(play.accuracy * 100).toFixed(2)}%`;
                let mods = play.mods.length == 0 ? '' : `${inlineCode(`+${play.mods.join('')}`)}`;
                let pp = `${play.pp.toFixed(0)}pp`;
                let playStats = `${bold("[")} ${/*300emoji*/play.statistics.count_300} • ${/*100emoji*/play.statistics.count_100} • ${/*50emoji*/play.statistics.count_50} • ${/*xemoji*/play.statistics.count_miss} ${bold("]")}`;
                let rankEmoji = client.emojis.cache.get(osuRanksAsEmojis(play.rank));
                let date = dateConversion(play.created_at);
                
                let username = play.user.username;
                
                let diffName = play.beatmap.version;
                let mapTitle = play.beatmapset.title;
                let mapArtist = play.beatmapset.artist;
                let beatmapLink = `${hyperlink(`${mapArtist} - ${mapTitle} [${diffName}]`, `https://osu.ppy.sh/b/${play.beatmap.id}`)}`;
                
                var beatmapAtt = await api.beatmaps.getBeatmapAttributes(play.beatmap.id, 'osu', {
                    body: {
                        mods: play.mods
                    }
                });

                beatmapAtt = beatmapAtt.attributes;

                let maxCombo = `x${bold(`${play.max_combo}`)}/${beatmapAtt.max_combo}`;
                let stars = `(${beatmapAtt.star_rating.toFixed(2)}★)`;

                topEmbed.addFields({
                    name: `${index} ${username} - ${pp}`,
                    value: `${beatmapLink} ${stars}\n${rankEmoji} ${acc} ${maxCombo} ${mods}\n${playStats}\nPlay set ${date}`
                });

                let interval = new Date();
                if ((interval - cooldown) / 1000 > 3) {
                    cooldown = interval;

                    let maxValue = topPlays.length;
                    let percentage = Math.floor((i / maxValue) * 100);

                    replying(loading().changeState(1, 'executing', percentage));
                }
            }

            console.log(`Done. Posting`);

            return await interaction.editReply({
                content: `  `,
                embeds: [topEmbed]
            });

            async function replying(embed) {
                if (!interaction) return;

                await interaction.editReply({
                    content: `  `,
                    embeds: [embed]
                });
            }
        } catch (error) {
            console.error(error);

            return await interaction.editReply({
                content: `There has been an error.`
            });
        }
    }
};