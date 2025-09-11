const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'playerRewards.json');
console.log(filePath);

const osuUser = require(`../../schemas/osuUser`);

const { cardRarity, getEloRank } = require('../osu/skillsCalculation');
const tiers = require(`../osu/cardTiers.json`);

module.exports = {
    async calcutatePlayerRewards(client) {
        console.log(`Starting reward calculation...`);
        const startTime = new Date();

        console.log(`Getting all users`);
        const list = client.guilds.cache.get("1245368064992870471"); 
        let members = await list.members.fetch();

        var dbUsers = await osuUser.find();
        var allUsers = [];

        // Iterate through the collection of GuildMembers from the Guild getting the username property of each member 
        await Promise.all(members.map(async member => {
            let userId = member.user.id;

            let userProfile = dbUsers.find(u => u.discordId == userId);

            if (userProfile) {
                const roles = member.roles.cache.map(role => role.name);

                if (roles.includes('Pre-Alpha Tester')) {
                    userProfile.accomplishments.push('Pre-Alpha');
                } else if (roles.includes('Alpha Tester')) {
                    userProfile.accomplishments.push('Alpha');
                } else {
                    userProfile.accomplishments.push('Beta');
                }

                allUsers.push(userProfile);
            }
        }));

        console.log(`${allUsers.length} users of ${list.name} have been fetched.`);

        let pixel = await osuUser.findOne({ osuUserName: 'WhitePixel_' });
        allUsers.unshift(pixel);

        // Sorting for inventory leaderboard
        console.log(`Sorting inventories`);
        let userProfiles = allUsers;
        for (let i=0; i<userProfiles.length; i++) {
            let target = userProfiles[i];

            async function invCompare(inv1, inv2) {
                async function invCalc(cards) {
                    let cardPts = 0;
                    let cardAvg = 0;
    
                    await Promise.all(cards.map(async card => {
                        let rarity = await cardRarity(card.stats.globalRank);
        
                        switch(rarity.rarity) {
                            case tiers.tier1:
                                cardPts += 100;
                                break;
                            case tiers.tier2:
                                cardPts += 40;
                                break;
                            case tiers.tier3:
                                cardPts += 20;
                                break;
                            case tiers.tier4:
                                cardPts += 8;
                                break;
                            case tiers.tier5:
                                cardPts += 1;
                                break;
                        }
        
                        cardAvg += card.stats.globalRank;
                    }));
    
                    cardAvg /= cards.length;
        
                    return {
                        cardAverage: cardAvg,
                        cardPoints: cardPts
                    }
                }

                let calc1 = await invCalc(inv1);
                let calc2 = await invCalc(inv2);

                if (calc1.cardPoints == calc2.cardPoints) return calc1.cardAverage > calc2.cardAverage;

                return calc1.cardPoints < calc2.cardPoints;
            }

            for (var j=i-1; j>=0 && (await invCompare(userProfiles[j].inventory.cards, target.inventory.cards)); j--) {
                userProfiles[j+1] = userProfiles[j];
            }
            userProfiles[j+1] = target;
        }

        console.log(`Inventories sorted.`);
        console.log(`Starting user calculation`);

        for (let user of allUsers) {
            console.log(`Calculating ${user.osuUserName}...`);
            let newCurrency = 0;

            // All users are Beta users by default
            let testerType = user.accomplishments.length == 0 ? 'Beta' : user.accomplishments[0];

            if (testerType != 'Beta') {
                newCurrency += 500;
            }

            // Inventory Rewards
            let cards = user.inventory.cards;

            for (let card of cards) {
                let rarity = await cardRarity(card.stats.globalRank);

                switch (rarity.rarity) {
                    case tiers.tier1:
                        newCurrency += 200;
                        break;
                    case tiers.tier2:
                        newCurrency += 80;
                        break;
                    case tiers.tier3:
                        newCurrency += 40;
                        break;
                    case tiers.tier4:
                        newCurrency += 20;
                        break;
                    case tiers.tier5:
                        newCurrency += 10;
                        break;
                }
            }

            let invTime = new Date();

            // Leaderboard Rewards
            // - ELO 
            const modes = ['1v1', '2v2'];
            for (const mode of modes) {
                let eloPlacement = await getEloRank(user.osuUserName, mode);
                
                if (eloPlacement <= 15) {
                    let placementReward = leaderboardReward(eloPlacement);
                    newCurrency += placementReward;

                    console.log(`[${user.osuUserName}] - Placed ${eloPlacement} on ${mode} Leaderboard!`);
                }
            }

            // - Inventory 
            for (let i=0; i<userProfiles.length; i++) {
                if (i == 15) break;

                let player = userProfiles[i].osuUserId;

                if (player == user.osuUserId) {
                    let placementReward = leaderboardReward(i + 1);
                    newCurrency += placementReward;

                    console.log(`[${user.osuUserName}] - Placed ${i + 1} on Inventory Leaderboard!`);
                }
            }

            // = Level
            userProfiles.sort((a,b) => {
                if (a.level.prestige == b.level.prestige) {
                    if (a.level.current == b.level.current) {
                        return b.level.xp - a.level.xp;
                    }
        
                    return b.level.current - a.level.current;
                }
    
                return b.level.prestige - a.level.prestige;
            });

            for (let i=0; i<userProfiles.length; i++) {
                if (i == 15) break;

                let player = userProfiles[i].osuUserId;

                if (player == user.osuUserId) {
                    let placementReward = leaderboardReward(i + 1);
                    newCurrency += placementReward;

                    console.log(`[${user.osuUserName}] - Placed ${i + 1} on Level Leaderboard!`);
                }
            }

            let leaderboardTime = new Date();
            console.log(`[${user.osuUserName}] - Currency after Beta calculation: ${newCurrency} (in ${((leaderboardTime - invTime)/1000).toFixed(2)}ms)`);

            savePlayerData({
                playerName: user.osuUserName,
                currency: newCurrency,
                test: testerType
            });

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        function leaderboardReward(placement) {
            let reward = 0

            switch (placement) {
                case 1:
                    reward += 600;
                    break;
                case 2:
                    reward += 200;
                    break;
                case 3:
                    reward += 100
                    break;
                default:
                    reward += 50;
                    break;
            }

            return reward;
        }

        let endTime = new Date();
        console.log(`Finished calculations! ${allUsers.length} users in ${((endTime - startTime) / 1000).toFixed(2)}secs`);

        return;

        // Save to file
        function savePlayerData(playerData) {
            let existingData = [];
            if (fs.existsSync(filePath)) {
                existingData = JSON.parse(fs.readFileSync(filePath));
            }

            existingData.push(playerData);

            fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
            console.log(`${playerData.playerName}'s data saved.\n`);
        }
    },

    async getPlayerRewards() {
        const playerData = readPlayerData();
        return playerData;

        // Read file
        function readPlayerData() {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath);
                return JSON.parse(data);
            } else {
                console.log(`No player data found.`);
                return [];
            }
        }
    },

    async checkPlayerRewards(discordId, playerData, osuUserName) {
        /*
            playerData = {
                playerName: String,
                currency: Number,
                test: String
            }[]
        */

        const user = !osuUserName 
            ? await osuUser.findOne({ discordId: discordId }) 
            : await osuUser.findOne({ osuUserName: osuUserName });

        if (!user) return;

        console.log(playerData);

        const userData = playerData.find(data => data.playerName == user.osuUserName);

        if (!userData) return;

        // In case the user already has some currency
        let currency = user.currency;

        currency += userData.currency;

        console.log(`${userData.test} Tester found! Giving rewards to ${user.osuUserName}`);

        if (!osuUserName) {
            await osuUser.updateOne({ discordId: discordId }, {
                $set: {
                    currency: currency,
                    accomplishments: [userData.test], // Array here
                },
            });
        } else {
            await osuUser.updateOne({ osuUserName: osuUserName }, {
                $set: {
                    currency: currency,
                    accomplishments: [userData.test], // Array here
                },
            });
        }

        return;
    }
};