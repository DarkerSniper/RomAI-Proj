const pb = {
    le: '<:pbLE:1345017314835435560>',
    me: '<:pbME:1345017306908069909>',
    re: '<:pbRE:1345017308224950333>',
    lf: '<:pbLF:1345017317171396638>',
    mf: '<:pbMF:1345017312469581867>',
    rf: '<:pbRF:1345017309974106133>'
};

const { hyperlink, bold, inlineCode, italic } = require('discord.js');

const ranks = require("./ranks.json");

const osuUser = require(`../../schemas/osuUser`);
const { eloRankAsEmojis } = require("./getEmojis");
const { getEloRank } = require('../osu/skillsCalculation');

module.exports = {
    async getPlayerRank(player, mode, elo, matches) {
        if (player) {
            let playerProfile = await osuUser.findOne({ osuUserName: player });
            elo = playerProfile.elo[mode];

            let gamesPlayed = playerProfile.matchRecord[mode];
            gamesPlayed = gamesPlayed.wins + gamesPlayed.losses;

            if (gamesPlayed < 5 && elo > ranks[ranks.length - 1].eloRange[0]) return 'Unranked';
        }

        if (matches && matches < 5 && elo > ranks[ranks.length - 1].eloRange[0]) return 'Unranked';

        for (const rank of ranks) {
            if (rank.eloRange.length == 1 && elo >= rank.eloRange[0]) return `${rank.rank}`;

            for (let i=rank.eloRange.length; i>=0; i--) {
                let range = rank.eloRange[i];

                if (elo >= range) return `${rank.rank} ${i + 1}`;
            }
        }

        return '';
    },

    async getRankProgress(discordId, mode, diff) {
        const profile = await osuUser.findOne({ discordId });
        const elo = profile.elo[mode];
        const matches = profile.matchRecord[mode].wins + profile.matchRecord[mode].losses;
    
        if (matches && matches < 5 && elo > ranks[ranks.length - 1].eloRange[0]) {
            return `Current ${mode} Rank: Unranked\nPlay ${bold(`${5 - matches}`)} more matches to reveal your rank!`;
        }
    
        let currentRank = '';
        let nextRank = '';
        let nextElo = null;
        let minElo = null;
    
        for (let i = 0; i < ranks.length; i++) {
            const { rank, eloRange } = ranks[i];
    
            for (let j = 0; j < eloRange.length; j++) {
                const tierMin = eloRange[j];
                const tierMax = (eloRange[j + 1] ?? Infinity);
    
                if (elo >= tierMin && elo < tierMax) {
                    currentRank = rank === 'Quantum' ? rank : `${rank} ${j + 1}`;
                    minElo = tierMin;
    
                    if (j + 1 < eloRange.length) {
                        // Next tier in same rank
                        nextRank = rank === 'Quantum' ? rank : `${rank} ${j + 2}`;
                        nextElo = eloRange[j + 1];
                    } else if (i > 0) {
                        // Promotion to the next higher rank
                        const higherRank = ranks[i - 1];
                        nextRank = higherRank.rank === 'Quantum' ? higherRank.rank : `${higherRank.rank} 1`;
                        nextElo = higherRank.eloRange[0];
                    }
                    break;
                }
            }
    
            if (currentRank) break;
        }
    
        // If already in the top rank
        if (!nextElo || currentRank === 'Quantum') {
            const userEloRank = await getEloRank(profile.osuUserName, mode);
            return `Current ${mode} Rank: ${currentRank} ${eloRankAsEmojis(currentRank)} ${bold(`${elo}`)} (${italic(`${diff}`)})\nYou are #${userEloRank} in RomAI!`;
        }
    
        // Progress bar calculation based on dynamic tier size
        const segmentSize = nextElo - minElo;
        let progressRatio = (elo - minElo) / segmentSize;
        progressRatio = Math.min(1, Math.max(0, progressRatio)); // Clamp between 0 and 1
    
        const progressBarLength = 10;
        const filledRaw = Math.round(progressRatio * progressBarLength);
        const filledSquares = Math.min(progressBarLength, filledRaw);
        const emptySquares = progressBarLength - filledSquares;
        const percentage = (progressRatio * 100).toFixed(1);
    
        const progressBar =
            (filledSquares ? pb.lf : pb.le) +
            (pb.mf.repeat(filledSquares) + pb.me.repeat(emptySquares)) +
            (filledSquares === progressBarLength ? pb.rf : pb.re);
    
        const results = [];
        results.push(`Current ${mode} Rank: ${currentRank} ${eloRankAsEmojis(currentRank)} ${bold(`${elo}`)} (${italic(`${diff}`)})`);
        results.push(`${eloRankAsEmojis(currentRank)}  ${progressBar} ${percentage}%  ${eloRankAsEmojis(nextRank)}`);
    
        return results.join('\n');
    },

    async getRankIcon(elo, matches) {
        if (matches < 5) return "./src/utils/images/rank-icons/Unranked.png";

        for (const rank of ranks) {
            for (let i=rank.eloRange.length; i>=0; i--) {
                let range = rank.eloRange[i];

                if (elo >= range) return rank.icon[i];
            }
        }

        return `./src/utils/images/rank-icons/Unranked.png"`;
    }
};