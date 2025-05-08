const { isOsuJSError, Client, Auth } = require('osu-web.js');
const { bold } = require('discord.js');

const { getCountryDigits, getTopPlayers } = require(`../osu/regions`);
const { getRandomInt } = require(`../osu/formatNum`);
const { cardRarity } = require(`../osu/skillsCalculation`);
const { inventoryAddPack } = require(`../discord/invAddPack`);

const tiers = require(`../osu/cardTiers.json`);
const packTypes = require(`../discord/packTypes.json`);

const osuUser = require(`../../schemas/osuUser`);

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async packOpener(country, packType) {
        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        var pack;
        let players = packType == 'Legend' ? await getTopPlayers() : await getCountryDigits(country);
        let random = getRandomInt(1, 100);
        console.log(`Random: ${random}`);
        let chance;

        async function packChance(tier1, tier2, tier3, tier4) {
            var selection = [];

            async function checkRarity(player, rankWanted) {
                let rarity = await cardRarity(player.rank);

                if (rarity.rarity == rankWanted) selection.push(player);
                else if (rarity.rarity == tiers.tier1 && rankWanted == 'Legendary') selection.push(player);
            }
            
            if (random <= tier1) {
                chance = tier1;
                await Promise.all(players.map(async player => {await checkRarity(player, tiers.tier2)}));
            } else if (random <= tier2) {
                chance = Math.abs(tier1 - tier2);
                await Promise.all(players.map(async player => {await checkRarity(player, tiers.tier3)}));
            } else if (random <= tier3) {
                chance = Math.abs(tier2 - tier3);
                await Promise.all(players.map(async player => {await checkRarity(player, tiers.tier4)}));
            } else if (random <= tier4) {
                chance = Math.abs(tier3 - tier4);
                await Promise.all(players.map(async player => {await checkRarity(player, tiers.tier5)}));
            } else {
                chance = 100 - tier4;
                await Promise.all(players.map(async player => {await checkRarity(player, tiers.tier6)}));
            }

            return selection;
        }

        await Promise.all(packTypes.map(async type => {
            if (type.name == packType) {
                pack = await packChance(type.chances.tier1, type.chances.tier2, type.chances.tier3, type.chances.tier4);
            }
        }));

        console.log(`Pack Size: ${pack.length}`);
        console.log(`Rarity Chance: ${chance}%`);

        let cardChance = getRandomInt(0, pack.length - 1);

        // Log the chance of getting the player that has been packed.
        chance *= (1 / pack.length);
        console.log(`Total Chance of getting current card: ${chance.toFixed(2)}%`)

        return {
            card: pack[cardChance],
            packType: packType,
            country: country
        };
    },

    async packReward(discordId, osuId, level, levelingChannels, prestige) {
        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const user = await api.users.getUser(osuId, {
            urlParams: {
              mode: 'osu'
            }
        });

        let userCountry = user.country_code;
        let userProfile = await osuUser.findOne({ discordId: discordId });

        function levelingMessage(typeName) {
            for (let i=0; i<levelingChannels.length; i++) {
                if (levelingChannels[i].members.find(member => member.user.id == discordId)) {
                    if (prestige > 0) {
                        levelingChannels[i].send({
                            content: `<@${discordId}> is now Prestige ${bold(prestige)} - Level ${bold(level)}! ${bold(typeName)} Pack can now be found in your inventory.`
                        });
                    } else {
                        levelingChannels[i].send({
                            content: `<@${discordId}> is now Level ${bold(level)}! ${bold(typeName)} Pack can now be found in your inventory.`
                        });
                    }
                }
            }
        }

        let packLevel = (prestige * 5) + level;

        while (packLevel > 20) {
            await inventoryAddPack(discordId, (await osuUser.findOne({ discordId: discordId })).inventory, {
                packType: 'Pro',
                country: userCountry
            });

            levelingMessage('Pro');

            packLevel -= 20;
        }

        for (let type of packTypes) {
            if (type.rewardLevel.end == 0 && type.rewardLevel.start == 0) {
                continue;
            }

            if ((type.rewardLevel.end == 0 && type.rewardLevel.start <= packLevel) || (type.rewardLevel.start <= packLevel && type.rewardLevel.end >= packLevel)) {
                await inventoryAddPack(discordId, (await osuUser.findOne({ discordId: discordId })).inventory, {
                    packType: type.name,
                    country: userCountry
                });

                levelingMessage(type.name);
            }
        }
    }, 

    async topPlayReward(discordId, topLocal) {
        // topLocal -> Number from 1 - 100
        let userProfile = await osuUser.findOne({ discordId: discordId });

        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const user = await api.users.getUser(userProfile.osuUserId, {
            urlParams: {
              mode: 'osu'
            }
        });

        let userRarity = (await cardRarity(user.statistics.global_rank)).rarity;

        let rewards = [];

        switch (userRarity) {
            case tiers.tier2:
                if (topLocal == 1) {
                    addReward(['Pro', 'Pro', 'Pro']);
                } else if (topLocal <= 5) {
                    addReward(['Contender', 'Pro']);
                } else if (topLocal <= 10) {
                    addReward(['Pro']);
                } else if (topLocal <= 50) {
                    addReward(['Intermediate', 'Contender']);
                } else if (topLocal <= 100) {
                    addReward(['Contender']);
                }

                break;
            case tiers.tier3:
                if (topLocal == 1) {
                    addReward(['Pro', 'Pro']);
                } else if (topLocal <= 5) {
                    addReward(['Intermediate', 'Pro']);
                } else if (topLocal <= 10) {
                    addReward(['Starter', 'Contender']);
                } else if (topLocal <= 50) {
                    addReward(['Starter', 'Intermediate']);
                } else if (topLocal <= 100) {
                    addReward(['Intermediate']);
                }

                break;
            case tiers.tier4:
                if (topLocal == 1) {
                    addReward(['Contender', 'Pro']);
                } else if (topLocal <= 5) {
                    addReward(['Starter', 'Contender']);
                } else if (topLocal <= 10) {
                    addReward(['Contender']);
                } else if (topLocal <= 50) {
                    addReward(['Intermediate']);
                } else if (topLocal <= 100) {
                    addReward(['Starter']);
                }

                break;
            case tiers.tier5:
                if (topLocal == 1) {
                    addReward(['Starter', 'Pro']);
                } else if (topLocal <= 5) {
                    addReward(['Contender']);
                } else if (topLocal <= 10) {
                    addReward(['Intermediate']);
                } else if (topLocal <= 50) {
                    addReward(['Starter']);
                }

                break;
            case tiers.tier6:
                if (topLocal == 1) {
                    addReward(['Intermediate']);
                } else if (topLocal <= 5) {
                    addReward(['Starter']);
                }

                break;
        }

        function addReward(packTypes) {
            for (let type of packTypes) {
                rewards.push({
                    packType: type,
                    country: user.country.code
                });
            }
        }

        return rewards;
    }
};