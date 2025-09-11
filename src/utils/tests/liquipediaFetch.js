const axios = require('axios');

const RateLimiter = (limit, interval) => {
    const queue = []; // Queue of requests
    let requestCount = 0; // Count of requests in the current interval
    let startTime = Date.now(); // Start time for the interval

    const processQueue = () => {
        if (requestCount < limit) {
            const nextRequest = queue.shift();
            if (nextRequest) {
                requestCount++;
                axios.get(nextRequest.url)
                    .then(response => {
                        // Create a response-like object
                        const responseLike = {
                            ok: response.status >= 200 && response.status < 300,
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            json: () => Promise.resolve(response.data), // Add json method
                        };
                        nextRequest.resolve(responseLike);
                    })
                    .catch(error => {
                        nextRequest.reject(new Error('Network error: ' + error.message));
                    });
                checkInterval();
            }
        }
    };

    const checkInterval = () => {
        const currentTime = Date.now();
        if (currentTime - startTime >= interval) {
            // Reset the counter and start time for the next interval
            requestCount = 0;
            startTime = currentTime;
            // Process the next request in the queue
            processQueue();
        } else {
            // If within the interval, continue processing requests
            setTimeout(processQueue, interval - (currentTime - startTime));
        }
    };

    const request = (url) => {
        return new Promise((resolve, reject) => {
            queue.push({ url, resolve, reject });
            processQueue();
        });
    };

    return { request };
};

const rateLimiter = RateLimiter(60, 3600000);

module.exports = {
    async fetchOsuData() {
        let pageTitle = 'Osu!_Main_Page';
        const url = `https://liquipedia.net/osu/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&format=json`;
        try {
            const data = await rateLimiter.request(url);
            console.log(data);
        } catch (error) {
            console.error(error);
        }

        console.log(data);
        return data;
    },

    async getOngoingTournaments() {
        const url = "https://liquipedia.net/osu/api.php?action=parse&prop=text&page=Special:Tournaments&format=json";
    
        try {
            const response = await rateLimiter.request(url);
            
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            
            const data = response.json();
            console.log(data);
            
            // Extract HTML content from the response
            const tournamentsHtml = data.parse.text['*'];
            
            // Create a DOM parser to parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(tournamentsHtml, 'text/html');
            
            // Query the relevant tournament table (update the selector as needed)
            const tournamentRows = doc.querySelectorAll('table.wikitable tbody tr');
            
            const ongoingTournaments = [];
    
            tournamentRows.forEach(row => {
                const columns = row.querySelectorAll('td');
                if (columns.length > 0) {
                    const tournamentName = columns[0]?.textContent.trim();
                    const status = columns[4]?.textContent.trim(); // Adjust based on actual status column index
                    
                    if (status === 'Ongoing') { // Check for ongoing status
                        ongoingTournaments.push({
                            name: tournamentName,
                            status: status
                        });
                    }
                }
            });
    
            return ongoingTournaments; // Return the filtered ongoing tournaments
        } catch (error) {
            console.error("Error fetching tournaments:", error);
        }
    },

    async getOWCteams() {
        try {
            const url = "https://liquipedia.net/osu/api.php?action=parse&page=Osu_World_Cup/2024/Qualifier&format=json";

            const response = await rateLimiter.request(url);
                
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = response.json();
            console.log(data);

            const teams = [];

            const htmlContent = data.parse.text['*'];

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            const teamElements = tempDiv.querySelectorAll('.team');

            teamElements.forEach(teamElement => {
                const teamName = teamElement.querySelector('.team-name').innerText;
                const playerElements = teamElement.querySelectorAll('.player');
                const players = Array.from(playerElements).map(player => player.innerText);

                teams.push({
                    name: teamName,
                    players: players
                });
            });

            return teams;
        } catch (error) {
            console.error('Error with fetching OWC teams:', error);
        }
    }
};