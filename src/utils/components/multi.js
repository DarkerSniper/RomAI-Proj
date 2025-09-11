const { EmbedBuilder } = require('discord.js');
const { LegacyClient } = require('osu-web.js');
const { generateTeamRegularVisual, generate1v1Visual, generateTeamInDepthVisual } = require('../discord/multiVisuals');
const { getPlayerRank, getRankIcon } = require('../discord/ranks');
const osuUser = require('../../schemas/osuUser');

const { osuAPI } = process.env;
const legacy = new LegacyClient(osuAPI);

module.exports = {
    async multiMatch(interaction, client, message, mpLink, ignoreMapsStart, ignoreMapsEnd) {
        try {
            const mpNumber = mpLink.includes('community/matches/') ? mpLink.split('matches/')[1] : mpLink;
            const lobby = await legacy.getMultiplayerLobby({ mp: mpNumber });

            if (!lobby) return { content: `No match was found` };

            const info = lobby.match;
            const maps = lobby.games;

            const multiEmbed = new EmbedBuilder()
                .setTitle(info.name)
                .setURL(`https://osu.ppy.sh/community/matches/${info.match_id}`)
                .setFooter({
                    text: `Match played: ${info.start_time}`
                });

            const matchUsers = new Map();
            const scoreCountsPerMap = [];

            let team1Name = 'Blue Team';
            let team2Name = 'Red Team';

            let team1Color = '';
            let team2Color = '';

            /*
            const matchTitleRegex = /\(([^)]+)\)\s+vs\s+\(([^)]+)\)/i;
            const match = info.name.match(matchTitleRegex);
            if (match) {
                team1Name = match[1];
                team2Name = match[2];
            }
            */

            let team1Wins = 0;
            let team2Wins = 0;

            let player1 = null;
            let player2 = null;

            for (let i = 0; i < maps.length; i++) {
                if (ignoreMapsStart && i < ignoreMapsStart) continue;
                if (ignoreMapsEnd && i >= maps.length - ignoreMapsEnd) continue;

                const map = maps[i];
                if (map.scoring_type !== 'Score V2') continue;

                const isTeamVs = map.team_type === 'Team VS';
                const isHeadToHead = map.team_type === 'Head To Head';
                if (!isTeamVs && !isHeadToHead) continue;

                scoreCountsPerMap.push(new Set(map.scores.map(s => s.user_id)).size);

                let blueScore = 0, redScore = 0, totalScore = 0;

                if (isTeamVs) {
                    for (const score of map.scores) {
                        if (score.team === 'Blue') blueScore += score.score;
                        else if (score.team === 'Red') redScore += score.score;
                    }

                    if (blueScore > redScore) team1Wins++;
                    else if (redScore > blueScore) team2Wins++;
                } else if (isHeadToHead) {
                    const scores = map.scores;
                    if (scores.length === 2) {
                        const [p1, p2] = scores;
                        if (!player1 || !player2) {
                            if (p1.team === 'Blue') {
                                player1 = p1.user_id;
                                player2 = p2.user_id;
                                team1Color = 'Blue';
                                team2Color = 'Red';
                            } else {
                                player1 = p2.user_id;
                                player2 = p1.user_id;
                                team1Color = 'Blue';
                                team2Color = 'Red';
                            }
                        }

                        if (p1.score > p2.score) {
                            if (p1.user_id === player1) team1Wins++;
                            else if (p1.user_id === player2) team2Wins++;
                        } else if (p2.score > p1.score) {
                            if (p2.user_id === player1) team1Wins++;
                            else if (p2.user_id === player2) team2Wins++;
                        }
                    }

                    totalScore = scores.reduce((sum, s) => sum + s.score, 0);
                }

                const scoresSorted = [...map.scores].sort((a, b) => b.score - a.score);
                const topScore = scoresSorted[0]?.score || 0;

                for (const score of map.scores) {
                    const userId = score.user_id;
                    const userScore = score.score;

                    let mapImpact = 0;
                    let clutchBonus = 0;
                    let teamContribution = 0;
                    let opponentImpact = 0;

                    if (isTeamVs) {
                        const isBlue = score.team === 'Blue';
                        const teamScore = isBlue ? blueScore : redScore;
                        const oppScore = isBlue ? redScore : blueScore;
                        const teamWon = teamScore > oppScore;
                        const winWeight = teamWon ? 1.0 : 0.6;

                        const teammates = map.scores.filter(s => s.team === score.team).length;
                        const expectedShare = 1 / teammates;
                        const actualShare = teamScore === 0 ? 0 : userScore / teamScore;
                        teamContribution = actualShare / expectedShare;
                        opponentImpact = oppScore === 0 ? 0 : userScore / oppScore;

                        mapImpact = (teamContribution * winWeight) + (opponentImpact * 0.3);

                        if (!teamWon && userScore === topScore) {
                            clutchBonus = 0.1;
                        }
                    } else if (isHeadToHead) {
                        const sortedScores = [...map.scores].sort((a, b) => b.score - a.score);
                        const rankIndex = sortedScores.findIndex(s => s.user_id === score.user_id);
                        const percentile = 1 - ((rankIndex + 1) / sortedScores.length);
                        mapImpact = percentile * 2;

                        if (userScore === topScore) {
                            clutchBonus = 0.1;
                        }
                    }

                    if (!matchUsers.has(userId)) {
                        matchUsers.set(userId, {
                            impacts: [],
                            totalScore: 0,
                            mapCount: 0,
                            clutchScore: 0,
                            team: score.team,
                            teamShares: [],
                            oppImpacts: []
                        });
                    }

                    const userData = matchUsers.get(userId);
                    userData.impacts.push(mapImpact);
                    userData.totalScore += userScore;
                    userData.mapCount += 1;
                    userData.clutchScore += clutchBonus;
                    userData.teamShares.push(teamContribution);
                    userData.oppImpacts.push(opponentImpact);
                }
            }

            const playerFinals = new Map();
            for (const [userId, data] of matchUsers.entries()) {
                const avgImpact = data.impacts.reduce((a, b) => a + b, 0) / data.impacts.length;
                const avgScore = data.totalScore / data.mapCount;
                const normalizedScore = Math.min(avgScore / 800000, 1);

                let rawScore = (avgImpact * 0.7) + (normalizedScore * 0.3) + data.clutchScore;

                if (avgScore >= 600000 && rawScore < 0.4) rawScore = 0.4;

                playerFinals.set(userId, {
                    rawScore,
                    avgScore
                });
            }

            const logistic = (x) => 100 / (1 + Math.exp(-5 * (x - 0.4)));

            const normalizedImpact = new Map();
            for (const [userId, { rawScore, avgScore }] of playerFinals.entries()) {
                const logisticScore = logistic(rawScore);
                const ceiling = Math.min(avgScore / 800000, 1) * 100;
                const finalScore = Math.min(logisticScore, ceiling);
                normalizedImpact.set(userId, Math.round(finalScore));
            }

            const playersData = [];
            const avgPlayersPerMap = scoreCountsPerMap.reduce((a, b) => a + b, 0) / scoreCountsPerMap.length;
            const lobbyMode = ignoreMapsStart ? maps[ignoreMapsStart].team_type : maps[0].team_type;

            const is1v1 = Math.round(avgPlayersPerMap) === 2;

            for (const [userId, score] of normalizedImpact.entries()) {
                const user = await legacy.getUser({ u: userId });
                const userStats = matchUsers.get(userId);
                const userProfile = await osuUser.findOne({ osuUserId: userId });

                let mode = lobbyMode === 'Head To Head' ? '1v1' : '2v2';
                let elo = userProfile?.elo?.[mode] ?? null;
                let record = userProfile?.matchRecord?.[mode] ?? null;
                let rankLogo = (elo && record) ? await getRankIcon(elo, record) : undefined;

                playersData.push({
                    userId,
                    username: user.username,
                    country: user.country,
                    avatarUrl: `https://a.ppy.sh/${userId}`,
                    score,
                    avgScore: Math.round(playerFinals.get(userId).avgScore),
                    impact: userStats.impacts.reduce((a, b) => a + b, 0) / userStats.impacts.length,
                    team: userStats.team,
                    teamShare: (userStats.teamShares?.reduce((a, b) => a + b, 0) || 0) / (userStats.teamShares?.length || 1),
                    oppImpact: (userStats.oppImpacts?.reduce((a, b) => a + b, 0) || 0) / (userStats.oppImpacts?.length || 1),
                    rank: { logoUrl: rankLogo }
                });
            }

            const teamData = [
                { teamName: team1Name, teamScore: team1Wins, teamColor: team1Color },
                { teamName: team2Name, teamScore: team2Wins, teamColor: team2Color }
            ];

            let attachment;
            if (is1v1) {
                attachment = await generate1v1Visual(playersData, teamData);
            } else {
                attachment = await generateTeamInDepthVisual(playersData, lobbyMode === 'Head To Head' ? undefined : teamData);
                // attachment = await generateTeamRegularVisual(playersData, teamData);
            }

            multiEmbed.setImage(`attachment://${attachment.name}`);

            return {
                embeds: [multiEmbed],
                files: [attachment]
            };

        } catch (error) {
            console.error(error);
            return {
                content: `There has been an error calculating this match`
            };
        }
    }
};
