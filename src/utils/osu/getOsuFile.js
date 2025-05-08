const fs = require('fs');
const path = require('path');

const { Downloader, DownloadEntry, DownloadType } = require('osu-downloader');

const downloader = new Downloader({
    rootPath: './cache',
    filesPerSecond: 10,
    synchronous: false
});

const replayDownloader = new Downloader({
    rootPath: './cache',
    filesPerSecond: 2,
    synchronous: true
});

const cacheDir = path.join(__dirname, 'cache');

module.exports = {
    async downloadAndGetOsuFile(beatmapIds) {
        try {
            const entries = [];
            for (let beatmapId of beatmapIds) {
                entries.push(new DownloadEntry({ 
                    id: beatmapId,
                    type: DownloadType.Beatmap
                }));
            }

            downloader.addMultipleEntries(entries);

            console.log(`Downloading ${entries.length} .osu files...`);

            const results = await downloader.downloadAll();

            for (let result of results) {
                if (result.statusText != "Written Successfuly" && result.statusText != "Already Exists") {
                    throw new Error(`Beatmap with ID "${result.id}" failed to download: "${result.statusText}"`);
                }
            }

            console.log(`${entries.length} .osu file downloaded and saved.`);

            return results;
        } catch (error) {
            console.error(`Error downloading .osu file: ${error.message}`);

            return undefined;
        }
    },

    async getClockRate(beatmapId, scoreId) {
        const replayUrl = `https://osu.ppy.sh/replays/${beatmapId}/${scoreId}`;
        const fileName = `${scoreId}.osr`;
        const downloadPath = path.join(cacheDir, fileName);

        try {
            console.log(`Downloading replay to ${downloadPath}...`);

            replayDownloader.addSingleEntry(new DownloadEntry({
                url: replayUrl,
                type: DownloadType.Replay,
                customName: fileName,
                save: false, 
            }));

            await replayDownloader.downloadSingle();
            console.log(`Downloaded replay to ${downloadPath}`);

            const buffer = fs.readFileSync(downloadPath);
            const view = new DataView(buffer);

            const clockRateOffset = 0x40;
            const clockRate = view.getFloat32(clockRateOffset, true);

            console.log(`Clock Rate found: x${clockRate}`);
            return clockRate;
        } catch (error) {
            console.error(`Error with finding clock rate: ${error.nessage}`);
            return undefined;
        }
    }
};