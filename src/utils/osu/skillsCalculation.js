const { isOsuJSError, Client, Auth } = require('osu-web.js');

const osuUser = require(`../../schemas/osuUser`);
const cardTypes = require(`../soii/cardTypes.json`);
const leaderboard = require(`../../schemas/leaderboards`);
const tiers = require(`../osu/cardTiers.json`);

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async aimCalc(a, cs, scoreSr, sr, misses, hidden) {
        // changed the fomula instead of 2 * 0.9 -> 1.8 - (misses / 10)
        // changed instead of a -> a * (scoreSr / sr)
        let calc;
        hidden = ((hidden / 100) * 0.3);

        console.log(a);

        calc = Math.pow(cs, 0.1) / Math.pow(4, 0.1);
        calc = calc * (2 - (misses / 5));
        calc = Math.pow(calc, Math.pow(scoreSr, 0.1));
        //calc = (a * (scoreSr / sr) + hidden) * calc;
        calc = (a + hidden) * calc;
        calc = calc * 100;

        return parseInt(calc);
    },

    async speedCalc(s, scoreBpm, ar, scoreSr, sr, c) {
        // Nerf farm maps using a maxcombo method
        // get score bpm and not beatmap bpm!!
        // changed instead of s -> s * (scoreSr / sr)
        // changed instead of bpm / (200 * (ar/6) * 0.6) -> (scoreBpm / 2) * Math.pow(maxcombo, 0.1) / (200 * (ar/6) * 0.6)
        let calc;

        //calc = ((s * (scoreSr / sr)) * (100 * (scoreBpm / 220) * Math.pow(c, 0.1) / (200 * (9.5/ar)))) * 2 * 100;
        calc = (s * (100 * (scoreBpm / 220) * Math.pow(c, 0.1) / (200 * (9.5/ar)))) * 2 * 100;


        return Math.round(calc);
    },
    
    async accuracyCalc(aimCalc, acc, sr, c, mc, speedCalc, od, hd) {
        let calc;

        const accEffect = Math.pow(acc / 100, 20);

        console.log(`NEW ACC: ${acc}`);

        calc = (aimCalc / 2) * (0.083 * sr * Math.pow(1.42, (c/mc)) - 0.3) + (speedCalc/2) * (od / 9) * (hd / 6) * (Math.pow(mc, Math.pow(0.12, (c/mc))) / 2);

        console.log(calc);

        calc = accEffect * calc;

        console.log(calc);
        
        return parseInt(calc);
    },

    async potentialCalc(fixedPP, fxiedAccuracyCalc) {
        // need idea + implementation with fixedPerformancePoints and accuracyCalculation
        let calc;

        calc = fixedPP + fxiedAccuracyCalc;

        return parseInt(calc);
    },

    async eloCalc(poolStars, nm1Stars) {
        let poolRating = (poolStars * 0.7) + (nm1Stars * 0.3);

        return Math.round(poolRating * 250);
    },

    async startingElo(userId) {
        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const user = await api.users.getUser(userId, {
            urlParams: {
              mode: 'osu'
            }
        });

        let globalRank = user.statistics.global_rank;
        let badges = user.active_tournament_banners ? user.active_tournament_banners.length : 0;
        let elo;

        // BWS - Badge-weighted seeding
        globalRank = Math.pow(globalRank, Math.pow(0.9937, Math.pow(badges, 2)));

        if (globalRank <= 1500) {
            elo = 1800;
        } else if (globalRank <= 5000) {
            elo = 1700;
        } else if (globalRank <= 7500) {
            elo = 1600;
        } else if (globalRank <= 30000) {
            elo = 1500;
        } else if (globalRank <= 70000) {
            elo = 1400;
        } else if (globalRank <= 150000) {
            elo = 1300;
        } else if (globalRank <= 300000) {
            elo = 1200;
        } else if (globalRank <= 500000) {
            elo = 1100;
        } else {
            elo = 1000;
        }

        return elo;
    },

    async duelElo(eloP1, eloP2) {
        let diff1 = eloP2 - eloP1;
        let diff2 = eloP1 - eloP2;

        function eloFormula(elo, diff, win) {
            let ratio = win ? 1 : -1;
            let k = 32; // Max point gain
            let c = 200; // Max player difference bonus

            let calc = Math.round(elo + (k/2) * (ratio + (0.5 * (diff/c))));
            
            if ((win && calc - elo < 0) || (!win && calc - elo > 0)) {
                if (!win) return elo - 1;

                return elo + 1;
            } else {
                return calc;
            }
        }

        let eloCalculations = {
            elo1: {
                gain: eloFormula(eloP1, diff1, true),
                lose: eloFormula(eloP1, diff1, false),
            },
            elo2: {
                gain: eloFormula(eloP2, diff2, true),
                lose: eloFormula(eloP2, diff2, false),
            }
        };

        console.log(eloCalculations);

        return eloCalculations;
    },

    async getElo(player, mode) {
        let user = await osuUser.findOne({ osuUserName: player });

        if (mode == 1) mode = '1v1';
        else if (mode == 2) mode = '2v2';
        else if (mode == 3) mode = '3v3';

        return user.elo[mode];
    },

    async getEloRank(player, mode) {
        // mode => '1v1' | '2v2' | '3v3'
        let user = await osuUser.findOne({ osuUserName: player });

        let allUsers = await osuUser.find();
        let usersWithElo = allUsers.filter((user) => user.elo[mode] != 0 && user.osuUserName != player);

        let placement = 1;

        for (let u of usersWithElo) {
            if (u.elo[mode] > user.elo[mode]) placement += 1;
        }

        return placement;
    },

    async addElo(player, eloAddition, mode) {
        // mode = 1 or 2 (for 1v1 or 2v2)
        let curLeaderboards = await leaderboard.find().exists(`players.${player}`); 

        if (curLeaderboards) {
            curLeaderboards.forEach(async lb => {
                if (lb.startDate != 0 && lb.endDate == 0 && lb.mode == mode) {
                    let tempMap = lb.players;

                    tempMap.set(player, eloAddition);
                    
                    await leaderboard.updateOne({ name: lb.name }, {
                        $set: {
                            players: tempMap
                        },
                    });
                }
            });
        }

        if (mode == 1) mode = '1v1';
        else if (mode == 2) mode = '2v2';
        else if (mode == 3) mode = '3v3';

        let osuUserProfile = await osuUser.findOne({ osuUserName: player });
        let userElo = osuUserProfile.elo;
        
        userElo[mode] = eloAddition;

        await osuUser.updateOne({ osuUserName: player }, {
            $set: {
                elo: userElo
            },
        });
    }, 

    async updateRecord(player, win, mode) {
        let curLeaderboards = await leaderboard.find().exists(`players.${player}`);

        if (curLeaderboards) {
            curLeaderboards.forEach(async lb => {
                if (lb.startDate != 0 && lb.endDate == 0 && lb.mode == mode) {
                    let tempMap = lb.records;
                    let tempRecord = tempMap.get(player);

                    if (!tempRecord.wins) {
                        tempMap.set(player, { 
                            "wins": parseInt(0),
                            "losses": parseInt(0)
                        });
                    }
    
                    if (win) { // true or false
                        tempMap.set(player, { 
                            "wins": parseInt(tempRecord.wins + 1),
                            "losses": parseInt(tempRecord.losses)
                        });
                    } else {
                        tempMap.set(player, {
                            "wins": parseInt(tempRecord.wins),
                            "losses": parseInt(tempRecord.losses + 1)
                        });
                    }
                    
                    await leaderboard.updateOne({ name: lb.name }, {
                        $set: {
                            records: tempMap
                        },
                    });
                }
            });
        }

        if (mode == 1) mode = '1v1';
        else if (mode == 2) mode = '2v2';
        else if (mode == 3) mode = '3v3';

        let user = await osuUser.findOne({ osuUserName: player });
        let userRecord = user.matchRecord;

        if (win) {
            userRecord[mode].wins += 1;
        } else {
            userRecord[mode].losses += 1;
        }

        await osuUser.updateOne({ osuUserName: player }, {
            $set: {
                matchRecord: userRecord
            },
        });
    },

    // Card Rarity
    async cardRarity(globalRanking) {
        let cardType;
        let tier;

        if (globalRanking <= 500) {
            cardType = cardTypes.white;
            tier = tiers.tier1;
        } else if (globalRanking <= 5000) {
            cardType = cardTypes.orange;
            tier = tiers.tier2;
        } else if (globalRanking <= 7500) {
            cardType = cardTypes.red;
            tier = tiers.tier3;
        } else if (globalRanking <= 30000) {
            cardType = cardTypes.purple;
            tier = tiers.tier4;
        } else if (globalRanking <= 70000) {
            cardType = cardTypes.blue;
            tier = tiers.tier5;
        } else {
            cardType = cardTypes.green;
            tier = tiers.tier6;
        }

        if (!globalRanking) {
            cardType = cardTypes.green;
            tier = tiers.tier6;
        }

        return {
            type: cardType,
            rarity: tier
        };
    }
};