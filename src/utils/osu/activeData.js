const { get } = require("lodash");
const { getRandomInt } = require(`../osu/formatNum`);

var currentBeatmap = 3773248;
var mapAuth = new Map();
var awaitingDuels = new Map();
var mapPool = {};
var midGame = [];
var playerSecret = undefined;
var packReservation = new Set();
var inMatch = new Set();

module.exports = {
    // Compare command
    async saveBeatmap(beatmap) {
        currentBeatmap = beatmap;
    },

    async getBeatmap() {
        return currentBeatmap;
    },

    // Auth command
    async authSaveUser(discordUser, region) {
        if (mapAuth.has(discordUser)) {
            mapAuth.delete(discordUser);
        }
        console.log(mapAuth);
        let verificationCode = `${getRandomInt(100, 999)}-${getRandomInt(100, 999)}`;

        if (region) {
            mapAuth.set(discordUser, `${verificationCode} ${region}`);
        } else
            mapAuth.set(discordUser, `${verificationCode} no-region`);
        console.log(mapAuth.get(discordUser));
    },

    async authClearUser(discordUser) {
        if (mapAuth.has(discordUser)) {
            mapAuth.delete(discordUser);
            return;
        }

        console.log(`${discordUser} is not in the authMap`);
    },

    async authGetUserCode(discordUser) {
        console.log(mapAuth);
        if (!mapAuth.has(discordUser)) return undefined;

        let code = mapAuth.get(discordUser).split(" ")[0];

        return code;
    },

    async authGetRegion(discordUser) {
        try {
            if (!mapAuth.has(discordUser)) return undefined;

            let splits = mapAuth.get(discordUser).split(" ");

            let countryCode = splits.pop().toString();
            console.log(splits);
            console.log(countryCode);

            let code = [];

            for (let i=1; i<splits.length; i++) {
                code.push(splits[i]);
            }

            code = code.toString();
            while (code.includes(",")) code = code.replace(",", " ");

            console.log(code);

            let res = [code, countryCode];

            return res;
        } catch (err) {
            console.log(err);
        }
    },

    async authGetUserId(code) {
        console.log(mapAuth);
        console.log(code);

        let user = undefined;
        for (const [key, value] of mapAuth.entries()) {
            if (code == value.split(" ")[0]) user = key;
        }
        
        return user;
    },

    async authReset() {
        mapAuth.clear();
    },

    // Dueling
    async saveAwaitingDuel(user, awaitingUser) {
        awaitingDuels.set(user, `${awaitingUser}`);
    },

    async getAwaitingDuel(user) {
        if (!awaitingDuels.has(user)) return undefined;
        return awaitingDuels.get(user);
    },

    async updateAwaitingDuel(user, awaitingUser, isAccepted) {
        if (awaitingDuels.get(user) != `${awaitingUser}`) return undefined;

        let accepted = isAccepted ? "true" : "false";
        awaitingDuels.set(user, `${awaitingUser} ${accepted}`);

        return accepted;
    },

    async removeAwaitingDuel(user, awaitingUser) {
        for (const [key, value] of awaitingDuels.entries()) {
            if (value == `${awaitingUser}` && key == user) return awaitingDuels.delete(key);
        }

        return console.log(`no awaiting duel found.`);
    },

    // Map Pools
    async saveMapPool(poolObject) {
        mapPool = poolObject;
        console.log(mapPool);
    },

    async getMapPool() {
        return mapPool;
    },

    // autoRef Matches
    async addGame(lobbyId) {
        midGame.push(lobbyId);
    },

    getGames() {
        return midGame;
    },

    async removeGame(lobbyId) {
        lobbyId = parseInt(lobbyId);

        if (midGame.indexOf(lobbyId) > -1) {
            midGame.splice(midGame.indexOf(lobbyId), 1);
            return true;
        }

        return false;
    },

    // Secrets
    async userSecret(discordId) {
        if (playerSecret == discordId) return false;

        playerSecret = discordId;
        return true;
    },

    // Packs
    async addPackReservation(discordId) {
        if (packReservation.has(discordId)) return false;

        packReservation.add(discordId);
        return true;
    },

    async removePackReservation(discordId) {
        discordId = parseInt(discordId);

        if (!packReservation.has(discordId)) {
            console.log(`User wasn't found in reservation.`);
            return false;
        }

        packReservation.delete(discordId);
        console.log(`User removed from reservation.`);
        return true;
    },

    // Match Limitation
    async addMatchLimitation(discordId) {
        if (inMatch.has(discordId)) return false;

        inMatch.add(discordId);
        return true;
    },

    async removeMatchLimitation(discordId) {
        if (!inMatch.has(discordId)) {
            console.log(`User wasn't found in a match.`);
            return false;
        }

        inMatch.delete(discordId);
        console.log(`User removed from match limitation.`);
        return true;
    },

    getMatchLimitation(discordId) {
        return inMatch.has(discordId);
    }
};