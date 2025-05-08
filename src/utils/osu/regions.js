const { isOsuJSError, Client, Auth } = require('osu-web.js');

const flags = require(`../discord/flags.json`);
const osuUser = require(`../../schemas/osuUser`);
const { getRandomInt } = require('./formatNum');

const arr = Object.keys(flags).map((key) => [key, flags[key]]);

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    // Custom Regional Rankings
    async getRegions() {
        let reg = [];

        arr.map(flag => {
            if (flag[0]) { // array '0' is the country code
                let regions = Object.keys(flag[1].regions).map((key) => [key, flag[1].regions[key]]);
                regions.map(region => {
                    let res = `${region[1].name} ${flag[0]}`;
                    reg.push(res);
                });
            }
        });

        return reg;
    },

    async getRegionFlag(country, region) {
        let png = undefined;

        arr.map(flag => {
            if (flag[0] == country) {
                console.log(flag[0]);
                let reg = Object.keys(flag[1].regions).map((key) => [key, flag[1].regions[key]]);
                reg.map(r => {
                    if (r[1].name == region) {
                        png = r[1].flag;
                    }
                });
            }
        });

        return png;
    },

    async getCountryRegions(country) {
        let countryRegions = [];

        arr.map(flag => {
            if (flag[1].name.toLowerCase() == country.toLowerCase()) {
                let regions = Object.keys(flag[1].regions).map((key) => [key, flag[1].regions[key]]);
                regions.map(region => {
                    countryRegions.push(region[1].name);
                });
            }
        });

        return countryRegions;
    },

    async getCountries() {
        let countries = [];

        arr.map(country => {
            let res = `${country[1].name}`;
            countries.push(res);
        });

        return countries;
    },

    async getCountryCode(countryName) {
        let name = undefined;

        arr.map(country => {
            if (country[1].name == countryName) name = `${country[0]}`;
        });

        return name;
    },

    async getRegionRank(username) {
        try {
            let user = await osuUser.findOne({ osuUserName: username });

            if (!user) return undefined;

            let region = user.ilRegion;

            if (region == "no-region") return undefined;

            const token = await auth.clientCredentialsGrant();
            const api = new Client(token.access_token);

            let playersInRegion = await osuUser.find({ ilRegion: region });

            let i = 1;
            let ids = [];
            const thisUser = await api.users.getUser(user.osuUserId, {
                urlParams: {
                  mode: 'osu'
                }
            });

            let userGlobal = thisUser.statistics.global_rank;
            
            async function compareUsers(userIds) {
                const users = await api.users.getUsers({
                    query: {
                      ids: userIds
                    }
                });

                users.forEach(u => {
                    let uGlobal = u.statistics_rulesets.osu.global_rank;
                    if (uGlobal != userGlobal && userGlobal > uGlobal) {
                        i += 1;
                    }
                });
            }

            playersInRegion.map(player => {
                if (player.osuUserId != user.osuUserId) ids.push(player.osuUserId);
            });

            await compareUsers(ids);

            return i;
        } catch (error) {
            console.log(error);
        }
    },

    // Regional Rankings using osuworld
    async fetchUserRegion(userId) {
        try {
            let response = await fetch(`https://osuworld.octo.moe/api/users/${userId}`);
            let userRegionInfo = await response.json();

            return {
                country: userRegionInfo.country_id,
                region: userRegionInfo.region_id,
                rank: userRegionInfo.placement
            };
        } catch (err) {
            console.log(err);
            return undefined;
        }
    },

    async fetchRegionInfo(country, region) {
        let png = undefined;
        let regionName = undefined;

        arr.map(flag => {
            if (flag[0] == country) {
                console.log(flag[0]);
                let reg = Object.keys(flag[1].regions).map((key) => [key, flag[1].regions[key]]);
                reg.map(r => {
                    if (r[0] == region) {
                        png = r[1].flag;
                        regionName = r[1].name;
                    }
                });
            }
        });

        return {
            name: regionName,
            flag: png
        };
    },

    // Packs Functions
    async getCountryDigits(country) {
        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const rankings = await api.ranking.getRanking('osu', 'performance', {
            query: {
              country: country
            }
        });

        let selection = [];
        let countryRegions = [];

        arr.map(flag => {
            if (flag[0] == country) {
                let regions = Object.keys(flag[1].regions).map((key) => [key, flag[1].regions[key]]);
                regions.map(region => {
                    countryRegions.push(region[0]);
                });
            }
        });
        
        // https://osuworld.octo.moe/api/<country-code>/<region>/top/<gamemode>?page=<N>
        try {
            let regionLimit = countryRegions.length > 13 ? 4 : 6;

            while (countryRegions.length > regionLimit) {
                let randomNum = getRandomInt(0, countryRegions.length - 1);
                countryRegions.splice(randomNum, 1);

                console.log(`Region number: ${randomNum} has been removed, ${countryRegions.length}`);
            }

            for (let r=0; r<countryRegions.length; r++) {
                let response = await fetch(`https://osuworld.octo.moe/api/${country}/${countryRegions[r]}/top/osu?page=1`);
                let regionInfo = await response.json();
    
                for (let i=1; i<regionInfo.pages + 1; i++) {
                    response = await fetch(`https://osuworld.octo.moe/api/${country}/${countryRegions[r]}/top/osu?page=${i}`);
                    console.log(`${countryRegions[r]} Page ${i} Status: ${response.status}`)
                    regionInfo = await response.json();
    
                    regionInfo.top.forEach(u => {
                        if (u.pp && u.pp > 10 && u.rank < 1000000) selection.push(u);
                    });

                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } catch (error) {
            console.error(error);
        }

        await Promise.all(rankings.ranking.map(player => {
            if (!selection.includes(player.user.id)) {
                selection.push({
                    id: player.user.id,
                    username: player.user.username,
                    mode: 'osu',
                    rank: player.global_rank,
                    pp: player.pp
                });
            }
        }));

        return selection;
    },

    async getTopPlayers() {
        const token = await auth.clientCredentialsGrant();
        const api = new Client(token.access_token);

        const rankings = await api.ranking.getRanking('osu', 'performance');

        let selection = [];

        await Promise.all(rankings.ranking.map(player => {
            if (!selection.includes(player.user.id)) {
                selection.push({
                    id: player.user.id,
                    username: player.user.username,
                    mode: 'osu',
                    rank: player.global_rank,
                    pp: player.pp
                });
            }
        }));

        return selection;
    }
};