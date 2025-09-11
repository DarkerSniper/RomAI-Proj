const { LegacyClient, isOsuJSError, Client, Auth } = require('osu-web.js');

const { osuAPI, osuId, osuToken } = process.env;

//Using the APIv1 with the private key that is located in a local file
const legacy = new LegacyClient(osuAPI);

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async checkTopPlays(score, username, beatmapId, scoreId) {
        /*
        const topScores = await legacy.getUserBestScores({
            u: username,
            limit: 100
        });
        */

        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const user = await api.users.getUser(username, {
            urlParams: {
              mode: 'osu'
            },
            query: {
                key: 'username'
            }
        });

        // APIv2 or Current API
        const topScores = await api.users.getUserScores(user.id, 'best', {
            query: {
                mode: 'osu',
                limit: 100
            }
        });

        score = parseFloat(`${score}`);
        console.log(`Calculating for top local: ${score}pp`);

        for (let topScore of topScores) {
            if (topScore.beatmap.id == beatmapId && parseFloat(`${topScore.pp}`) > score) {
                console.log(`Kicking out of top local: ${topScore.pp.toFixed(0)} is higher than ${score}`);
                return undefined;
            }
        }

        for (let i=0; i < topScores.length; i++) {
            let currentScore = parseFloat(topScores[i].pp);

            if (score >= currentScore) {
                return i + 1;
            }
        }
        return undefined;
    },
    async checkLeaderboard(score, beatmap) {
        const leaderboard = await legacy.getBeatmapScores({
            b: beatmap,
            limit: 50
        });

        for (let i=0; i < leaderboard.length; i++) {
            currentScore = leaderboard[i].score;

            if (score >= currentScore) {
                return i+1;
            }
        }
        return undefined;
    },
};