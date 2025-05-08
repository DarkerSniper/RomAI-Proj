const osuUser = require(`../../schemas/osuUser`);

const ranks = require(`../discord/ranks.json`);

const { rankDistributionGraph } = require("../discord/rankDistribution");
const { getPlayerRank, getRankProgress } = require("../discord/ranks");

module.exports = {
    async testRankDistribution(mode) {
        // mode = "1v1" | "2v2"
        const users = await osuUser.find();

        var distribution = [];
        var rankNames = [];
        var rankIcons = [];

        ranks.forEach(rank => {
            let rankNum = rank.eloRange.length;
            let c = rank.eloRange.length - 1;

            rank.eloRange.forEach(range => {
                if (rank.eloRange.length == 1) {
                    rankNames.push(rank.rank);
                } else {
                    rankNames.push(`${rank.rank} ${rankNum}`);
                    rankNum--;
                }

                distribution.push(0);
                rankIcons.push(rank.icon[c]);
                c--;
            });
        });

        console.log(`Inserting user ranks...`);

        let c = 0;

        for (const user of users) {
            let userElo = user.elo[mode];
            let userRank = await getPlayerRank(undefined, mode, userElo);

            if (userRank) {
                // get rank index
                let rankIndex = 0;
                let found = false;

                for (let rank of ranks) {
                    for (let r=rank.eloRange.length - 1; r>=0; r--) {
                        let range = rank.eloRange[r];

                        if (userElo >= range) found = true;

                        if (found) break;
                        else rankIndex++;
                    }

                    if (found) break;
                }

                distribution[rankIndex] += 1;
            }

            c++;
            console.log(`Users inserted: ${c}/${users.length}`);
        }

        console.log(distribution);

        console.log(`Creating graph...`);

        const graph = await rankDistributionGraph(distribution, rankNames, rankIcons);

        console.log(`Done.`);

        return {
            files: [graph]
        };
    },

    async testRankProgress(username) {
        let romUser = await osuUser.findOne({ osuUserName: username });
        const rankProgression = await getRankProgress(romUser.discordId, '1v1', `+18`);
            
        return rankProgression;
    }
}