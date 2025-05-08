const { EmbedBuilder, hyperlink, bold, inlineCode, italic } = require('discord.js');
const { isOsuJSError, Client, Auth } = require('osu-web.js');

const osuUser = require(`../../schemas/osuUser`);
const tiers = require(`../osu/cardTiers.json`);

const { numberWithCommas } = require(`../osu/formatNum`);
const { cardRarity } = require(`../osu/skillsCalculation`);
const { getPlayerRank } = require('../discord/ranks');
const { pagination } = require('../discord/pagination');
const { eloRankAsEmojis } = require('../discord/getEmojis');

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

const playerLimit = 50;

module.exports = {
    async globalLeaderboard(interaction, client, mode, isGlobal) {
        let idsWithElo = [];

        if (!isGlobal) {
            // Get the Guild and store it under the variable "list"
            const list = client.guilds.cache.get(interaction.guild.id); 
            console.log(list.name);
            let members = await list.members.fetch();


            console.log(`Fetching all users' ELO...`);
            // Iterate through the collection of GuildMembers from the Guild getting the username property of each member 
            await Promise.all(members.map(async member => {
                let userId = member.user.id;
                console.log(member.user.username);
                let userProfile = await osuUser.findOne({ discordId: userId });

                if (!userProfile || userProfile.elo[mode] == 0) return;

                idsWithElo.push({
                    id: userProfile.osuUserId,
                    elo: userProfile.elo[mode],
                    discord: userProfile.discordId,
                    profile: userProfile
                });
            }));
        } else {
            const users = await osuUser.find();

            await Promise.all(users.map(async user => {
                if (!user || user.elo[mode] == 0) return;

                idsWithElo.push({
                    id: user.osuUserId,
                    elo: user.elo[mode],
                    discord: user.discordId,
                    profile: user
                });
            }));
        }

        console.log(`Sorting osuIDs...`);
        idsWithElo.sort((a, b) => b.elo - a.elo);

        var osuIds = idsWithElo.map(user => user.id);
        console.log(`Finished sorting.`);

        let topOsuIds = osuIds.slice(0, playerLimit - 1); // Display more info about the top 50 players

        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        console.log(`Fetching top users from osuAPI...`);

        var users = await api.users.getUsers({
            query: {
              ids: topOsuIds
            }
        });

        let leaderboardTitle = !isGlobal ? `This server's ${mode} Leaderboard` : `Global ${mode} Leaderboard`;

        const leaderboardEmbed = new EmbedBuilder().setTitle(leaderboardTitle);
        const leaderboardEmbeds = [leaderboardEmbed];

        console.log(`Sorting fetched top users...`);

        // Fetch all users' ELO values in one go
        const usersWithElo = await Promise.all(users.map(async user => {
            const osuUserData = await osuUser.findOne({ osuUserId: user.id });
            return { ...user, elo: osuUserData.elo[mode] };
        }));

        // Sort users based on their ELO values in descending order
        usersWithElo.sort((a, b) => b.elo - a.elo);

        // Original users array sorted
        users = usersWithElo.map(user => user);

        console.log(`Making leaderboards...`);

        let embedCount = 0;

        for (let i=0; i<idsWithElo.length; i++) {
            let curEmbed = leaderboardEmbeds[embedCount];

            if (i % 15 == 0 && i != 0) {
                leaderboardEmbeds.push(new EmbedBuilder().setTitle(leaderboardTitle));

                embedCount++;
                curEmbed = leaderboardEmbeds[embedCount];
            }

            let userProfile = idsWithElo[i].profile;
            console.log(`- ${userProfile.osuUserName} ${i}/${osuIds.length}`);
            
            let gamesPlayed = userProfile.matchRecord[mode];
            gamesPlayed = gamesPlayed.wins + gamesPlayed.losses;
            
            let userRank = await getPlayerRank(undefined, mode, userProfile.elo[mode], gamesPlayed);

            userRank = `${eloRankAsEmojis(userRank)} ${userRank}`;
            
            if (i >= playerLimit - 1) {
                curEmbed.addFields({
                    name: `  `,
                    value: `${i + 1}. <@${userProfile.discordId}> ${bold(userProfile.osuUserName)} - ${userRank}\nELO: ${userProfile.elo[mode]} (${userProfile.matchRecord[mode].wins}W - ${userProfile.matchRecord[mode].losses}L)`
                });
                
                continue;
            }

            let user = users.find(u => u.id === userProfile.osuUserId);

            let globalRank = italic(numberWithCommas(user.statistics_rulesets.osu.global_rank));

            curEmbed.addFields({
                name: `  `,
                value: `${i + 1}. :flag_${user.country_code.toLowerCase()}: <@${userProfile.discordId}> ${bold(user.username)} (#${globalRank}) - ${userRank}\nELO: ${userProfile.elo[mode]} (${userProfile.matchRecord[mode].wins}W - ${userProfile.matchRecord[mode].losses}L)`
            });

            if (i == 0) curEmbed.setThumbnail(user.avatar_url);
        }

        let requestedUser = idsWithElo.findIndex(u => interaction.user.id === u.discord);

        if (requestedUser > -1) {
            for (let lbEmbed of leaderboardEmbeds) {
                lbEmbed.setFooter({
                    text: `Your position: #${requestedUser + 1}/${osuIds.length}`,
                    iconURL: interaction.user.displayAvatarURL()
                });
            }
        }

        console.log(`Finished with ${leaderboardEmbeds.length} embeds.`);

        await pagination(interaction, leaderboardEmbeds);
    },

    async cardLeaderboard(interaction, client, isGlobal) {
        var userProfiles = [];

        const list = client.guilds.cache.get(interaction.guild.id); 

        if (!isGlobal) {
            console.log(list.name);
            let members = await list.members.fetch();

            // Iterate through the collection of GuildMembers from the Guild getting the username property of each member 
            await Promise.all(members.map(async member => {
                let userId = member.user.id;
                console.log(member.user.username);
                let userProfile = await osuUser.findOne({ discordId: userId });

                if (!userProfile || userProfile.inventory.cards.length == 0) return;

                userProfiles.push(userProfile);
            }));
        } else {
            const users = await osuUser.find();

            await Promise.all(users.map(async user => {
                if (!user || user.inventory.cards.length == 0) return;

                userProfiles.push(user);
            }));
        }

        let leaderboardTitle = !isGlobal ? `This server's Inventory Leaderboard` : `Global Inventory Leaderboard`;

        const leaderboardEmbed = new EmbedBuilder().setTitle(leaderboardTitle);

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
                                cardPts += 300;
                                break;
                            case tiers.tier2:
                                cardPts += 100;
                                break;
                            case tiers.tier3:
                                cardPts += 40;
                                break;
                            case tiers.tier4:
                                cardPts += 20;
                                break;
                            case tiers.tier5:
                                cardPts += 8;
                                break;
                            case tiers.tier6:
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

        for (let i=0; i<userProfiles.length; i++) {
            if (i == 15) break;

            let user = userProfiles[i];
            console.log(`Inv- ${user.osuUserName}`);

            let prestige = user.level.prestige > 0 ? `${bold(`Prestige ${user.level.prestige}`)} - ` : '';
            let level = user.level.current;
            let invInfo = {
                tier1: 0,
                tier2: 0,
                tier3: 0,
                tier4: 0,
                tier5: 0,
                tier6: 0
            };

            await Promise.all(user.inventory.cards.map(async card => {
                let rarity = await cardRarity(card.stats.globalRank);

                switch(rarity.rarity) {
                    case tiers.tier1:
                        invInfo.tier1 += 1;
                        break;
                    case tiers.tier2:
                        invInfo.tier2 += 1;
                        break;
                    case tiers.tier3:
                        invInfo.tier3 += 1;
                        break;
                    case tiers.tier4:
                        invInfo.tier4 += 1;
                        break;
                    case tiers.tier5:
                        invInfo.tier5 += 1;
                        break;
                    case tiers.tier6:
                        invInfo.tier6 += 1;
                        break;
                }
            }));

            leaderboardEmbed.addFields({
                name: `  `,
                value: `${i + 1}. <@${user.discordId}> ${prestige}${italic(`Level: ${level}`)}\n${inlineCode(tiers.tier1)}: ${invInfo.tier1} ${inlineCode(tiers.tier2)}: ${invInfo.tier2} ${inlineCode(tiers.tier3)}: ${invInfo.tier3} ${inlineCode(tiers.tier4)}: ${invInfo.tier4} ${inlineCode(tiers.tier5)}: ${invInfo.tier5} ${inlineCode(tiers.tier6)}: ${invInfo.tier6}`
            });

            if (i == 0 && !isGlobal) {
                let member = list.members.cache.get(user.discordId);
                leaderboardEmbed.setThumbnail(member.user.avatarURL());
            };
        }

        await interaction.editReply({
            content: `  `,
            embeds: [leaderboardEmbed]
        });
    },

    async levelLeaderboard(interaction, client, isGlobal) {
        const list = client.guilds.cache.get(interaction.guild.id); 

        var userProfiles = [];

        if (!isGlobal) {
            console.log(list.name);
            let members = await list.members.fetch();

            // Iterate through the collection of GuildMembers from the Guild getting the username property of each member 
            await Promise.all(members.map(async member => {
                let userId = member.user.id;
                console.log(member.user.username);
                let userProfile = await osuUser.findOne({ discordId: userId });

                if (!userProfile || userProfile.level.current == 0) return;

                userProfiles.push(userProfile);
            }));
        } else {
            const users = await osuUser.find();

            await Promise.all(users.map(async user => {
                if (!user || user.level.current == 0) return;

                userProfiles.push(user);
            }));
        }

        userProfiles.sort((a,b) => {
            if (a.level.prestige == b.level.prestige) {
                if (a.level.current == b.level.current) {
                    return b.level.xp - a.level.xp;
                }
    
                return b.level.current - a.level.current;
            }

            return b.level.prestige - a.level.prestige;
        });

        let leaderboardTitle = !isGlobal ? `This Server's Level Leaderboard` : `Global Level Leaderboard`;

        const levelEmbed = new EmbedBuilder().setTitle(leaderboardTitle);

        for (let i=0; i<userProfiles.length; i++) {
            if (i == 15) break;

            let profile = userProfiles[i];
            let prestige = profile.level.prestige > 0 ? `${bold(`Prestige ${profile.level.prestige}`)} - ` : '';

            levelEmbed.addFields({
                name: `  `,
                value: `${i + 1}. <@${[profile.discordId]}> ${bold(profile.osuUserName)} ${prestige}Level: ${bold(`${profile.level.current}`)} ${italic(`(${profile.level.xp}/${50 + (profile.level.current * 50)}XP)`)}`
            });

            if (i == 0 && !isGlobal) {
                let member = list.members.cache.get(profile.discordId);
                levelEmbed.setThumbnail(member.user.avatarURL());
            };
        }

        await interaction.editReply({
            content: `  `,
            embeds: [levelEmbed]
        });
    } 
};