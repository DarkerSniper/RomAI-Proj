const { isOsuJSError, Auth, Client } = require('osu-web.js');

const osuUser = require("../../schemas/osuUser");
const season = require(`../../schemas/season`);

const ranks = require(`../discord/ranks.json`);

const { weeklyRewards } = require("../discord/packs");
const { getPlayerRank } = require("../discord/ranks");
const { getWeeklyRewardsTime } = require("../osu/formatNum");
const { addElo, startingElo, getEloRank } = require("../osu/skillsCalculation");
const { inventoryAddPack } = require("../discord/invAddPack");
const { addCurrecny } = require('../discord/currency');
const { default: mongoose } = require('mongoose');

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async checkWeeklyRewards(client) {
        let timeTillRewards = await getWeeklyRewardsTime();

        setTimeout(function() {
            // start handling rewards
            //handleWeeklyRewards();
        }, timeTillRewards);

        async function handleWeeklyRewards() {
            var decayDeadline = new Date()

            decayDeadline.setDate(decayDeadline.getDate() - 7);

            const allUsers = await osuUser.find();

            for (const user of allUsers) {
                // ELO DECAY (only for 1v1)
                let userStartingElo = await startingElo(user.osuUserId);
                let isSafeDecay = user.recentMatches.some(match => match.players.length === 2 && match.date - decayDeadline > 0);

                if (!isSafeDecay && userStartingElo < user.elo["1v1"]) await addElo(user.osuUserName, user.elo["1v1"] - 5, 1);

                // PLAYER REWARDS (only if 3 ranked matches found this week)
                let matchCount = 0;

                for (let match of user.recentMatches) {
                    if (match.players.length === 2 || match.players.length === 4) matchCount++;
                    if (matchCount === 3) break;
                }

                if (matchCount === 3) {
                    // give rewards per rank
                    await weeklyRewards(user.discordId); // command to select custom country
                }

                // RESET RECENT MATCHES
                // UPDATE USER
                await osuUser.updateOne({ discordId: user.discordId }, {
                    $set: {
                        recentMatches: []
                    }
                });
            }
        }
    },

    async checkSeasonReset() {
        const seasons = await season.find();
        
        let currentSeason;

        if (seasons && seasons.length > 0) {
            currentSeason = seasons[seasons.length - 1];
        } else {
            currentSeason = await new season({
                _id: new mongoose.Types.ObjectId,
                seasonNumber: 0,
                startDate: Date()
            });
            
            await currentSeason.save().catch(console.error);
        }

        const allUsers = await osuUser.find();

        for (let i=0; i<allUsers.length; i++) {
            const user = allUsers[i];
            let userSeasons = user.seasons ?? [];
            
            // Add stats to a new season and start new season
            userSeasons.push({
                season: currentSeason.seasonNumber,
                matchRecord: {
                    "1v1": user.matchRecord["1v1"],
                    "2v2": user.matchRecord["2v2"]
                },
                peak: {
                    "1v1": user.peak["1v1"] || user.elo["1v1"] || 0,
                    "2v2": user.peak["2v2"] || user.elo["2v2"] || 0
                }
            });

            // ELO Change
            /*
            const startingELO = await startingElo(user.osuUserId);
            const eloReset = 70;

            let duelELO = user.peak["1v1"] - eloReset < startingELO ? startingELO : user.peak["1v1"] - eloReset;
            let duosELO = user.peak["2v2"] - eloReset < startingELO ? startingELO : user.peak["2v2"] - eloReset;

            if (duelELO > 1800) duelELO = 1800;
            if (duosELO > 1800) duosELO = 1800;
            */
            
            // Reset scoreRewards & seasonal stats
            await osuUser.updateOne({ osuUserId: user.osuUserId }, {
                $set: {
                    elo: {
                        "1v1": 0,
                        "2v2": 0
                    },
                    matchRecord: {
                        "1v1": {
                            wins: 0,
                            losses: 0
                        },
                        "2v2": {
                            wins: 0,
                            losses: 0
                        }
                    },
                    peak: {
                        "1v1": 0,
                        "2v2": 0
                    },
                    seasons: userSeasons,
                    scoreRewards: []
                }
            });

            // User peak rank
            let peakElo = userSeasons[userSeasons.length - 1].peak['1v1'];
            let peakMatches = 
                userSeasons[userSeasons.length - 1].matchRecord['1v1'].wins +
                userSeasons[userSeasons.length - 1].matchRecord['1v1'].losses;

            if (peakMatches < 5 || peakElo < userSeasons[userSeasons.length - 1].peak['2v2']) {
                peakElo = userSeasons[userSeasons.length - 1].peak['2v2'];
                peakMatches = 
                    userSeasons[userSeasons.length - 1].matchRecord['2v2'].wins +
                    userSeasons[userSeasons.length - 1].matchRecord['2v2'].losses;
            }
            
            // Handle Rewards
            await rankRewards(user.discordId, await getPlayerRank(undefined, undefined, peakElo, peakMatches));
            
            console.log(`Users updated: ${i + 1}/${allUsers.length}`);
            
        }

        // start new season
        const newSeason = await new season({
            _id: new mongoose.Types.ObjectId,
            seasonNumber: currentSeason.seasonNumber + 1,
            startDate: Date()
        });
        
        await newSeason.save().catch(console.error);

        function delay(ms) {
            return new Promise(res => setTimeout(res, ms));
        }

        async function rankRewards(discordId, rank, country) {
            switch(rank) {
                case ranks[0].rank:
                    await addCurrecny(discordId, 10000);
                    break;
                case `${ranks[1].rank} 3`:
                    await addCurrecny(discordId, 8800);
                    break;
                case `${ranks[1].rank} 2`:
                    await addCurrecny(discordId, 8300);
                    break;
                case `${ranks[1].rank} 1`:
                    await addCurrecny(discordId, 8100);
                    break;
                case `${ranks[2].rank} 3`:
                    await addCurrecny(discordId, 6700);
                    break;
                case `${ranks[2].rank} 2`:
                    await addCurrecny(discordId, 6400);
                    break;
                case `${ranks[2].rank} 1`:
                    await addCurrecny(discordId, 6100);
                    break;
                case `${ranks[3].rank} 3`:
                    await addCurrecny(discordId, 5400);
                    break;
                case `${ranks[3].rank} 2`:
                    await addCurrecny(discordId, 4700);
                    break;
                case `${ranks[3].rank} 1`:
                    await addCurrecny(discordId, 4300);
                    break;
                case `${ranks[4].rank} 3`:
                    await addCurrecny(discordId, 3600);
                    break;
                case `${ranks[4].rank} 2`:
                    await addCurrecny(discordId, 3200);
                    break;
                case `${ranks[4].rank} 1`:
                    await addCurrecny(discordId, 2900);
                    break;
                case `${ranks[5].rank} 3`:
                    await addCurrecny(discordId, 2500);
                    break;
                case `${ranks[5].rank} 2`:
                    await addCurrecny(discordId, 2300);
                    break;
                case `${ranks[5].rank} 1`:
                    await addCurrecny(discordId, 2100);
                    break;
                case `${ranks[6].rank} 3`:
                    await addCurrecny(discordId, 1450);
                    break;
                case `${ranks[6].rank} 2`:
                    await addCurrecny(discordId, 1250);
                    break;
                case `${ranks[6].rank} 1`:
                    await addCurrecny(discordId, 1150);
                    break;
                default:
                    if (rank.includes(ranks[7].rank)) {
                        await addCurrecny(discordId, 700);
                    }
                    break;
            }
        }
    }
};