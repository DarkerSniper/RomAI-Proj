const { google } = require('googleapis');

// Parse the credentials from the environment variable
const { googleCredentials } = process.env;
const credentials = JSON.parse(googleCredentials);

// Create a JWT client
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

module.exports = {
    async getPoolFromGoogleSpreadsheet(spreadsheetId) {
        try {
            await client.authorize();
            const sheets = google.sheets({ version: 'v4', auth: client });
            
            // Get spreadsheet metadata to access all sheets
            const spreadsheetMetadata = await sheets.spreadsheets.get({
                spreadsheetId,
            });
    
            const allFilteredMaps = []; // Store results from all sheets
    
            // Iterate through each sheet
            for (const sheet of spreadsheetMetadata.data.sheets) {
                const title = sheet.properties.title; // Get the sheet title
                const rowCount = sheet.properties.gridProperties.rowCount;
                const columnCount = sheet.properties.gridProperties.columnCount;
    
                // Define the range based on row and column counts
                const range = `${title}!A1:${String.fromCharCode(65 + columnCount - 1)}${rowCount}`;
    
                // Fetch the data using the detected range
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range,
                });
    
                const data = response.data.values || []; // Handle empty data
    
                // Define the map types we want to extract
                const mapTypes = ['NM1', 'NM2', 'NM3', 'NM4', 'NM5', 
                                  'HD1', 'HD2', 'HD3', 
                                  'HR1', 'HR2', 'HR3', 
                                  'DT1', 'DT2', 'DT3', 
                                  'TB'];
    
                const filteredMaps = [];
    
                data.forEach(row => {
                    let mod = null;
                    let mapIds = [];
    
                    row.forEach(cell => {
                        if (mapTypes.includes(cell)) {
                            mod = cell;
                        } else if (cell) {
                            mapIds.push(cell);
                        }
                    });
    
                    if (mod && mapIds.length > 0) {
                        const mapId = mapIds[mapIds.length - 1];
                        filteredMaps.push({ mod, mapId });
                    }
                });
    
                // Combine results from this sheet with the overall results
                allFilteredMaps.push({ sheet: title, maps: filteredMaps });
            }
    
            console.log(allFilteredMaps);
            return allFilteredMaps;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
};