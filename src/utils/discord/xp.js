const { isOsuJSError, Client, Auth } = require('osu-web.js');

const osuUser = require(`../../schemas/osuUser`);

const { packReward } = require(`../discord/packs`);
const { inventoryAddPack } = require(`../discord/invAddPack`);

const { osuId, osuToken } = process.env;

//APIv2
const auth = new Auth(osuId, osuToken);

module.exports = {
    async xpAdd(discordId, xpToAdd, levelingChannels) {
        var userProfile = await osuUser.findOne({ discordId: discordId });
        var userLevel = userProfile.level;
        
        let levelMax = 50 + (userLevel.current * 50);
        let newXp = xpToAdd + userLevel.xp;

        if (newXp >= levelMax && userLevel.current == 20) {
            // Prestige
            const token = await auth.clientCredentialsGrant();
            const api = new Client(token.access_token);

            const userOsu = await api.users.getUser(userProfile.osuUserId, {
                urlParams: {
                  mode: 'osu'
                },
                query: {
                    key: 'id'
                }
            });

            userLevel.prestige += 1;
            userLevel.current = 1;

            userLevel.xp = newXp - levelMax;

            
            await packReward(discordId, userProfile.osuUserId, userLevel.current, levelingChannels, userLevel.prestige);
            
            // Give Champion pack
            await inventoryAddPack(discordId, (await osuUser.findOne({ discordId: discordId })).inventory, {
                packType: "Champion",
                country: userOsu.country.code
            });
        } else if (newXp >= levelMax) {
            userLevel.current += 1;
            userLevel.xp = newXp - levelMax;
            packReward(discordId, userProfile.osuUserId, userLevel.current, levelingChannels, userLevel.prestige);
        } else {
            userLevel.xp = newXp;
        }

        await osuUser.updateOne({ discordId: discordId }, {
            $set: {
                level: userLevel
            }
        });
    }
};