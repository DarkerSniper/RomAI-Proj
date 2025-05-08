const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://osu.ppy.sh/rankings.osu';

module.exports = {
    async scrapeILplayers() {
        try {
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            
            const players = [];

            $('.ranking-page-table tbody tr').each((index, element) => {
                const playerName = $(element).find('.username').text().trim();
                const playerCountry = $(element).find('country-flag').attr('title');

                const playerRank = $(element).find('.rank').text().trim();
                
                players.push({
                    rank: playerRank,
                    name: playerName,
                    country: playerCountry
                });
            });

            console.log(players);

            return {
                content: `Done scraping`
            };
        } catch (error) {
            console.error(error);

            return {
                content: `error`
            };
        }
    }
};