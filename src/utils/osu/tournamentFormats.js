const { getRandomInt } = require(`../osu/formatNum`);

module.exports = {
    // Keep like that for now
    async roundRobin(teams) {
        // Initialize match parameters
        const maxMatches = teams.length > 4 ? 4 : 3;
        const rounds = [];
        const matchCount = {};
        const playedMatches = new Set();
    
        // Initialize match count for each team
        for (const team of teams) {
            matchCount[team.name] = 0;
        }
    
        // Create all possible matches
        const allMatches = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                allMatches.push({ home: teams[i], away: teams[j] });
            }
        }
    
        // Randomly shuffle matches
        const shuffledMatches = allMatches.sort(() => Math.random() - 0.5);
    
        // Schedule matches until each team reaches maxMatches
        while (Object.values(matchCount).some(count => count < maxMatches)) {
            const round = [];
            const usedTeams = new Set();
    
            for (const match of shuffledMatches) {
                const { home, away } = match;
    
                // Check if both teams can still play
                if (!usedTeams.has(home.name) && !usedTeams.has(away.name) &&
                    matchCount[home.name] < maxMatches &&
                    matchCount[away.name] < maxMatches &&
                    !playedMatches.has(`${home.name}-${away.name}`) &&
                    !playedMatches.has(`${away.name}-${home.name}`)) {
    
                    // Schedule the match
                    round.push(match);
                    usedTeams.add(home.name);
                    usedTeams.add(away.name);
                    matchCount[home.name]++;
                    matchCount[away.name]++;
                    playedMatches.add(`${home.name}-${away.name}`);
    
                    // Exit if we reach the max matches for the round
                    if (round.length >= Math.ceil(teams.length / 2)) {
                        break;
                    }
                }
            }
    
            if (round.length > 0) {
                rounds.push(round);
            } else {
                break; // Exit if no matches can be scheduled
            }
        }
    
        // Ensure all teams have played the required matches
        for (const team of teams) {
            if (matchCount[team.name] !== maxMatches) {
                console.error(`Team ${team.name} did not play the required number of matches. Played: ${matchCount[team.name]}`);
                return undefined;
            }
        }
    
        return rounds;
    },

    async singleElimBracket(teams) {
        /*
            teams: [{
                name: String,
                players: [String],
                record: {
                    wins: Number,
                    losses: Number
                }
            }]
        */

        const schedule = [];
        
        if (teams.length == 4) {
            schedule.push([{ home: teams[0], away: teams[3], score: undefined }, { home: teams[1], away: teams[2], score: undefined }]);
            schedule.push([{ home: undefined, away: undefined, score: undefined }]);
        } else if (teams.length == 2) {
            schedule.push([{ home: teams[0], away: teams[1], score: undefined }]);
        }

        return schedule;
    }
};