const pb = {
    le: '<:pbLE:1345017314835435560>',
    me: '<:pbME:1345017306908069909>',
    re: '<:pbRE:1345017308224950333>',
    lf: '<:pbLF:1345017317171396638>',
    mf: '<:pbMF:1345017312469581867>',
    rf: '<:pbRF:1345017309974106133>'
};

function formatResults(upvotes = [], downvotes = []) {
    const totalVotes = upvotes.length + downvotes.length;
    const progressBarLength = 14;
    const filledSquares = Math.round((upvotes.length / totalVotes) * progressBarLength) || 0;
    const emptySquares = progressBarLength - filledSquares || 0;

    if (!filledSquares && !emptySquares) {
        emptySquares = progressBarLength;
    }

    const upPercentage = (upvotes.length / totalVotes) * 100 || 0;
    const downPercentage = (downvotes.length / totalVotes) * 100 || 0;

    const progressBar = 
        (filledSquares ? pb.lf : pb.le) + 
        (pb.mf.repeat(filledSquares) + pb.me.repeat(emptySquares)) +
        (filledSquares === progressBarLength ? pb.rf : pb.re);

    const results = [];
    results.push(`👍 ${upvotes.length} upvotes (${upPercentage.toFixed(1)}%) • 👎 ${downvotes.length} downvotes (${downPercentage.toFixed(1)}%)`);
    results.push(progressBar);

    return results.join('\n');

}

module.exports = formatResults;