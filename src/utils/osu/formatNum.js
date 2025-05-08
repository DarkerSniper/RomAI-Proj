/*
    dateConversion function:
        Given a string with a format of: YYYY-MM-DD HH:MM:SS
        date = string
        
        Turn date into this format instead: 
            6 second(s) ago
        If date has passed the 60 second mark:
            1 minute(s) ago
        If date has passed the 60 minute mark:
            2 hour(s) ago

        Example for input and output:
            The time right now for the example: 17 Mar 21:17 2024
            input:
                2024-03-17 21:15
            output:
                2 minute(s) ago

*/

const moment = require(`moment`);

module.exports = {
    numberWithCommas(num) {
        if (!num) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    dateConversion(date) {
        //Explanation above
        var relativeTime = moment.utc(date).unix();
        relativeTime = `<t:${relativeTime}:R>`;
        return relativeTime;
    },

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    cardDate() {
        return moment().format('DD-MM-YYYY');
    },
};