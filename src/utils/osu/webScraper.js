const PORT = 8000;

const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');

const app = express();

module.exports = {
    async getRegionalRanking() {
        const url = 'https://osuworld.octo.moe';

        const userData = [];

        axios(url)
            .then(response => {
                const html = response.data;
                const $ = cheerio.load(html);
                
                $('.chakra-stack _playersLiist_17omc_1 css-tl3ftk>div').each((i, userStack) => {
                    const username = $(userStack).find('.chakra-stack _w100_17omc_66 css-tl3ftk div div div p').text();
                    userData.push(username);
                });
            })

        app.listen(PORT, () => console.log(`server running on port: ${PORT}`));
    },
};