const { isOsuJSError, Auth, Client } = require('osu-web.js');

const osuUser = require("../../schemas/osuUser");
const season = require(`../../schemas/season`);
//const cron = require(`node-cron`);

const ranks = require(`../discord/ranks.json`);

const { getPlayerRank } = require("../discord/ranks");
const { cardRarity, startingElo } = require("../osu/skillsCalculation");
const { inventoryAddPack } = require("../discord/invAddPack");
const { addCurrecny } = require('../discord/currency');

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

const mongoose = require('mongoose');


module.exports = {
    async septemberUpdate() {
        var allUsers = await osuUser.find();

        let count = 0;

        allUsers.forEach(async user => {
            let inventory = user.inventory;
            let cards = inventory.cards;

            for (let i=0; i<cards.length; i++) {
                let card = cards[i];

                let type = await cardRarity(card.stats.globalRank);

                inventory.cards[i]["card-type"] = type.type;
            }

            await osuUser.updateOne({ discordId: user.discordId }, {
                $set: {
                    "inventory": inventory
                }
            });

            count++;
            console.log(`Progress: ${count}/${allUsers.length}`);
        });

        return {
            content: `All users updated.`
        };
    },
    async simulateSeasonReset() {
        try {
                const allUsers = await osuUser.find();

                console.log(`Start giving rewards...`);

                for (let i=0; i<allUsers.length; i++) {
                    const user = allUsers[i];
                    
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
                            }
                        }
                    });
                    
                    // Handle Rewards
                    //await rankRewards(user.discordId, await getPlayerRank(undefined, undefined, peakElo, peakMatches), userOsu.country.code);
                    
                    console.log(`Users updated: ${i + 1}/${allUsers.length}`);
                    
                }
        } catch (err) {
            console.error("Error resetting ELO:", err);
        }   
    }
};