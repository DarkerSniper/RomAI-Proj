const { hyperlink } = require(`discord.js`);
const { discordId } = process.env;

module.exports = {
    async createInvite(client, message) {
        let result;
        let url = `https://discordapp.com/oauth2/authorize?&client_id=${discordId}&scope=bot`;
        let interUser = message.member.user.tag;

        if (interUser == 'romdarker') {
            return result = {
                content: `${hyperlink('Invite Link', url)}`
            };
        }
        return result = {
            content: `You have no permission to execute this command.`
        };
    }
}