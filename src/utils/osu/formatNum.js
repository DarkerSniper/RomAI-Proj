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

const WEEKLY_REWARDS_DAY = 0; // Sunday
const WEEKLY_REWARDS_TIME = 0; // 00:00

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

    async getWeeklyRewardsTime() {
        let weeklyRewards = new Date();
    
        while (weeklyRewards.getDay() !== WEEKLY_REWARDS_DAY) {
            weeklyRewards.setDate(weeklyRewards.getDate() + 1);
        }
    
        weeklyRewards.setHours(WEEKLY_REWARDS_TIME, 0, 0, 0);
    
        const rightNow = new Date();
    
        // If the time is already passed for today, go to next week
        if (weeklyRewards.getTime() - rightNow.getTime() <= 0) {
            weeklyRewards.setDate(weeklyRewards.getDate() + 7);
        }
    
        return weeklyRewards.getTime() - rightNow.getTime();
    },    
};