// osu! Grades
const rankF = '1219575284823490621';
const rankD = '1219576065190658130';
const rankC = '1219576062913150987';
const rankB = '1219576061529034802';
const rankA = '1219576058475577464';
const rankS = '1219576067052802090';
const rankSS = '1219576074380251206';
const rankSH = '1219576070932664420';
const rankSSH = '1219576077941215233';

// ELO Ranks
const candidate = [
    '<:Candidate1:1355042628584079440>',
    '<:Candidate2:1355042629854953573>',
    '<:Candidate3:1355042631230558417>',
    '<:Candidate4:1355042633449345024>'
];
const silver = [
    '<:Silver1:1355042850269827094>',
    '<:Silver2:1355042662318608443>',
    '<:Silver3:1355042851783966750>'
];
const gold = [
    '<:Gold1:1355042845257629736>',
    '<:Gold2:1355042648238325830>',
    '<:Gold3:1355042650742587523>'
];
const platinum = [
    '<:Platinum1:1355042846754996364>',
    '<:Platinum2:1355042655049879612>',
    '<:Platinum3:1355042848562745426>'
];
const diamond = [
    '<:Diamond1:1355042640676257892>',
    '<:Diamond2:1355042642504974397>',
    '<:Diamond3:1355042644396347504>'
];
const atomos = [
    '<:Atomos1:1355042616655482953>',
    '<:Atomos2:1355042618555240579>',
    '<:Atomos3:1355042626600177754>'
];
const cosmic = [
    '<:Cosmic1:1355042635126935624>',
    '<:Cosmic2:1355042637358432256>',
    '<:Cosmic3:1355042639153594378>'
];
const quantum = '<:Quantum:1355042658749251595>';

const rankEmojis = [cosmic, atomos, diamond, platinum, gold, silver, candidate];

module.exports = {
    osuRanksAsEmojis(rank) {
        switch(rank) {
            case 'F':
                return rankF;
            case 'D':
                return rankD;
            case 'C':
                return rankC;
            case 'B':
                return rankB;
            case 'A':
                return rankA;
            case 'S':
                return rankS;
            case 'SS':
                return rankSS;
            case 'X':
                return rankSS;
            case 'SH':
                return rankSH;
            case 'SSH':
                return rankSSH;
            case 'XH':
                return rankSSH;
            default:
                return rankF;
        }
    },

    eloRankAsEmojis(rank) {
        if (rank == 'Quantum') return quantum;
        if (rank == 'Unranked' || rank == undefined) return '';

        let rankName = rank.split(' ')[0];
        let rankNum = parseInt(rank.split(' ')[1]); 

        for (let rankEmoji of rankEmojis) {
            if (rankEmoji[0].includes(rankName)) {
                return rankEmoji[rankNum - 1];
            }
        }

        return '';
    }
};