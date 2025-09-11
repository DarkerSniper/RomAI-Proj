const achievements = require(`./achievements.json`);
const osuUser = require(`../../schemas/osuUser`);
const { getPlayerRank } = require("./ranks");
const { getEloRank } = require("../osu/skillsCalculation");

module.exports = {
    async checkMatchAchievement(player, client) {
        try {
            const playerProfile = await osuUser.findOne({ osuUserName: player });
            const playerAchievements = playerProfile.achievements ?? [];
            let discordUser = undefined;

            // Run checks
            await checkTotalMatches();
            await checkRank();
            //await checkTop();

            async function evaluateAchievement({
                achievementName,
                currentValue,
                compareFn,
                messageFn,
            }) {
                const achievement = achievements.find(a => a.name === achievementName);
                if (!achievement) return;

                const index = playerAchievements.findIndex(a => a.name === achievementName);

                for (let i = achievement.tiers.length - 1; i >= 0; i--) {
                    const tier = achievement.tiers[i];

                    if (index === -1) {
                        if (compareFn(tier)) {
                            playerAchievements.push({ name: achievementName, tier });
                            await saveAndNotify(tier, achievementName, messageFn);
                            break;
                        }
                    } else {
                        const currentTier = playerAchievements[index].tier;
                        if (currentTier.key >= tier.key) break;

                        if (compareFn(tier)) {
                            playerAchievements[index].tier = tier;
                            await saveAndNotify(tier, achievementName, messageFn);
                            break;
                        }
                    }
                }
            }

            async function saveAndNotify(tier, achievementName, messageFn) {
                await osuUser.updateOne(
                    { osuUserId: playerProfile.osuUserId },
                    { $set: { achievements: playerAchievements } }
                );
                if (!discordUser) discordUser = client.users.cache.get(playerProfile.discordId);
                await discordUser?.send({
                    content: `You have unlocked tier ${tier.key + 1} of the achievement: ${achievementName}\n${messageFn(tier)}`
                });
            }

            async function checkTotalMatches() {
                const matchRecord = playerProfile.matchRecord;
                const totalMatches = (playerProfile.seasons?.reduce((total, season) => 
                            total + 
                            (season.matchRecord?.["1v1"]?.wins || 0) +
                            (season.matchRecord?.["1v1"]?.losses || 0) +
                            (season.matchRecord?.["2v2"]?.wins || 0) +
                            (season.matchRecord?.["2v2"]?.losses || 0)
                            , 0) || 0) + 

                            matchRecord["1v1"].wins + matchRecord["1v1"].losses +
                            matchRecord["2v2"].wins + matchRecord["2v2"].losses;

                await evaluateAchievement({
                    achievementName: "Total Matches",
                    currentValue: totalMatches,
                    compareFn: tier => parseInt(tier.value) <= totalMatches,
                    messageFn: tier => `That means you have played a total of ${tier.value} matches <3`,
                });
            }

            async function checkRank() {
                const rankDuel = await getPlayerRank(playerProfile.osuUserName, '1v1');
                const rankDuo = await getPlayerRank(playerProfile.osuUserName, '2v2');
                const hasRankDuel = await getEloRank(playerProfile.osuUserName, '1v1') !== 'Unranked';
                const hasRankDuo = await getEloRank(playerProfile.osuUserName, '2v2') !== 'Unranked';

                await evaluateAchievement({
                    achievementName: "Reach Rank",
                    currentValue: [rankDuel, rankDuo],
                    compareFn: tier => rankDuel.includes(tier.value) && hasRankDuel || rankDuo.includes(tier.value) && hasRankDuo,
                    messageFn: tier => `Congrats on reaching ${tier.value}!!`,
                });
            }

            async function checkTop() {
                const topDuel = await getEloRank(playerProfile.osuUserName, '1v1');
                const topDuo = await getEloRank(playerProfile.osuUserName, '2v2');

                await evaluateAchievement({
                    achievementName: "Top Player",
                    currentValue: Math.min(topDuel, topDuo),
                    compareFn: tier => parseInt(tier.value) <= topDuel || parseInt(tier.value) <= topDuo,
                    messageFn: tier => `Wow you're really good huh? Top ${tier.value}`,
                });
            }
        } catch (err) {
            console.log(err);
        }
        
    }
};
