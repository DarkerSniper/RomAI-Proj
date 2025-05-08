const { calcModStat, calcAccuracy } = require(`osu-web.js`);
const { calculateStarRating } = require(`osu-sr-calculator`);

const { hr, dt, ez, ht } = calcModStat;

module.exports = {
    convertCircleSize(mods, cs) {
        if (mods.length == 0) return cs;

        let conversion = cs;

        if (mods.indexOf('HR')) {
            conversion = hr.cs(conversion);
        } else if (mods.indexOf('EZ')) {
            conversion = ez.cs(conversion);
        }

        return conversion;
    },

    convertApproachRate(mods, ar) {
        if (mods.length == 0) return ar;

        let conversion = ar;

        if (mods.indexOf('HR')) {
            conversion = hr.ar(conversion);
        }
        if (mods.indexOf('EZ')) {
            conversion = ez.ar(conversion);
        }
        if (mods.indexOf('DT')) {
            conversion = dt.ar(conversion);
        } 
        if (mods.indexOf('HT')) {
            conversion = ht.ar(conversion)
        } 

        return conversion;
    },

    convertOverallDifficulty(mods, od) {
        if (mods.length == 0) return od;

        let conversion = od;

        if (mods.indexOf('HR')) {
            conversion = hr.od(conversion);
        }
        if (mods.indexOf('EZ')) {
            conversion = ez.od(conversion);
        }
        if (mods.indexOf('DT')) {
            conversion = dt.od(conversion);
        }
        if (mods.indexOf('HT')) {
            conversion = ht.od(conversion)
        }

        return conversion;
    },

    convertHealthPoints(mods, hp) {
        if (mods.length == 0) return hp;

        let conversion = hp;

        if (mods.indexOf('HR')) {
            conversion = hr.hp(conversion);
        } else if (mods.indexOf('EZ')) {
            conversion = ez.hp(conversion);
        }

        return conversion;
    },

    convertBpm(mods, bpm) {
        if (mods.length == 0) return bpm;

        let conversion = bpm;

        if (mods.indexOf('DT')) {
            conversion = dt.bpm(conversion);
        } else if (mods.indexOf('HT')) {
            conversion = ht.bpm(conversion);
        }

        return conversion;
    },

    convertLength(mods, length) {
        if (mods.length == 0) return length;

        let conversion = length;

        if (mods.indexOf('DT')) {
            conversion = dt.length(conversion);
        } else if (mods.indexOf('HT')) {
            conversion = ht.length(conversion);
        }

        return conversion;
    },

    async convertStarRating(mods, beatmapId) {
        let conversion;

        if (mods.length == 0) {
            conversion = await calculateStarRating(beatmapId);
        } else {
            conversion = await calculateStarRating(beatmapId, mods);
        }
        console.log(Object.values(conversion)[0]);

        return parseFloat(Object.values(conversion)[0]).toFixed(2);
    },

    convertAccuracy(c300, c100, c50, misses) {
        return calcAccuracy.osu(c300, c100, c50, misses);
    },
};