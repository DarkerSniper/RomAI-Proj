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
    '<:Candidate1:1399683674252906526>',
    '<:Candidate2:1399683779223617668>',
    '<:Candidate3:1399683836995960902>',
    '<:Candidate4:1399683867815841903>'
];
const silver = [
    '<:Silver1:1399683907594489926>',
    '<:Silver2:1399683943619366992>',
    '<:Silver3:1399683961264934922>'
];
const gold = [
    '<:Gold1:1399683980588089374>',
    '<:Gold2:1399683996736295023>',
    '<:Gold3:1399684021956378695>'
];
const platinum = [
    '<:Platinum1:1399684041846030356>',
    '<:Platinum2:1399684055565340762>',
    '<:Platinum3:1399684074964258847>'
];
const diamond = [
    '<:Diamond1:1399684102600396922>',
    '<:Diamond2:1399684120174526514>',
    '<:Diamond3:1399684137723494530>'
];
const atomos = [
    '<:Atomos1:1399684156002402354>',
    '<:Atomos2:1399684171877842944>',
    '<:Atomos3:1399684185999937679>'
];
const cosmic = [
    '<:Cosmic1:1399684212579373148>',
    '<:Cosmic2:1399684226386890794>',
    '<:Cosmic3:1399684241087926342>'
];
const quantum = '<:Quantum:1399684263816990841>';

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