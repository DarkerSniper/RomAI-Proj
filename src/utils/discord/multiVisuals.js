const { AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const loadImage = Canvas.loadImage;

Canvas.GlobalFonts.registerFromPath('./src/utils/fonts/Torus/Torus-Bold.otf', 'Torus-Bold');
Canvas.GlobalFonts.registerFromPath('./src/utils/fonts/Torus/Torus-Regular.otf', 'Torus');
Canvas.GlobalFonts.registerFromPath('./src/utils/fonts/Torus/Torus-SemiBold.otf', 'Torus SemiBold');

function formatScore(score) {
    return score.toLocaleString();
}

function getMedal(index) {
    return index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
}

function getColor(index) {
    const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    return colors[index] || '#ffffff';
}

function getTeamColor(team) {
    if (team === 'Blue' || team === 'Blue Team') return '#007bff';
    if (team === 'Red' || team === 'Red Team') return '#ff4d4f';
    return '#444';
}

function getScoreColor(score) {
    if (score >= 85) return '#00bfff';
    if (score >= 65) return '#00ff7f';
    if (score >= 48) return '#ffd700';
    if (score >= 30) return '#bbbbbb';
    return '#ff4d4f';
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    ctx.fill();
}

function drawSpaceBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0d0d2b');
    gradient.addColorStop(1, '#1a1a40');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 150; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
        ctx.fill();
    }
}

async function generatePodiumCanvas(players, mode = 'regular', matchInfo = {}) {
    if (mode === '1v1') return generate1v1Canvas(players, matchInfo);

    const playerCount = players.length;
    const rowHeight = 100;
    const padding = 40;
    const width = 1100;
    const height = padding * 2 + playerCount * rowHeight + (players[0]?.team ? 60 : 0);
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    drawSpaceBackground(ctx, width, height);

    players.sort((a, b) => b.score - a.score);

    const teams = Array.from(new Set(players.map(p => p.team).filter(Boolean)));
    if (teams.length > 0 && matchInfo?.length >= 2) {
        ctx.font = '28px Torus-Bold';

        const first = matchInfo[0];
        const firstText = `${first.teamName} : ${first.teamScore}`;
        ctx.fillStyle = getTeamColor(first.teamName);
        ctx.fillText(firstText, 80, 40);

        const second = matchInfo[1];
        const secondText = `${second.teamScore} : ${second.teamName}`;
        ctx.fillStyle = getTeamColor(second.teamName);
        const secondWidth = ctx.measureText(secondText).width;
        ctx.fillText(secondText, width - secondWidth - 80, 40);
    }

    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const y = padding + i * rowHeight + (teams.length > 0 ? 40 : 0);

        ctx.fillStyle = p.team ? getTeamColor(p.team) : '#1e1e2c';
        ctx.globalAlpha = 0.1;
        ctx.fillRect(60, y, width - 120, rowHeight - 10);
        ctx.globalAlpha = 1.0;

        ctx.font = '24px Torus-Bold';
        ctx.fillStyle = getColor(i);
        const place = `#${i + 1}`;
        ctx.fillText(place, 68, y + 40);

        if (p.avatarUrl) {
            const avatar = await loadImage(p.avatarUrl) ?? undefined;
            const avatarX = 110, avatarY = y + 5, avatarSize = 50;
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            if (avatar) ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
        }

        ctx.font = '24px Torus SemiBold';
        ctx.fillStyle = '#ffffff';
        let usernameFontSize = 24;
        const usernameMaxWidth = 200;
        while (ctx.measureText(p.username).width > usernameMaxWidth && usernameFontSize > 14) {
            usernameFontSize -= 1;
            ctx.font = `${usernameFontSize}px Torus SemiBold`;
        }
        ctx.fillText(p.username, 170, y + 38);

        let flagX = 170 + ctx.measureText(p.username).width + 10;

        if (p.country) {
            const flag = await loadImage(`https://osu.ppy.sh/images/flags/${p.country}.png`);
            ctx.drawImage(flag, flagX, y + 22, 24, 16);
            flagX += 34;
        }

        ctx.font = '22px Torus SemiBold';
        ctx.fillStyle = getScoreColor(p.score);
        ctx.fillText(`Score: ${p.score}`, Math.max(flagX, 400), y + 38);

        if (p.rank && p.rank.logoUrl) {
            const rankLogo = await loadImage(p.rank.logoUrl) || undefined;
            const logoSize = 60;
            const centerX = width - 80;
            const centerY = y + rowHeight / 2 - 5;
        
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, logoSize / 2 + 10, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, logoSize / 2 + 10);
            gradient.addColorStop(0, '#aa80ff');
            gradient.addColorStop(1, '#330066');
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#aa80ff';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.closePath();
            ctx.clip();
        
            ctx.shadowBlur = 0;
            ctx.drawImage(rankLogo, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
            ctx.restore();
        }
        
        if (mode === 'team_in_depth') {
            ctx.font = '18px Torus';
            ctx.fillStyle = '#bbbbbb';
            ctx.fillText(`Avg: ${formatScore(p.avgScore)}`, 600, y + 22);
            ctx.fillText(`Team Impact: ${(p.teamShare * 100).toFixed(1)}%`, 600, y + 40);
            ctx.fillText(`Opponent Impact: ${(p.oppImpact * 100).toFixed(1)}%`, 600, y + 58);
        } else {
            // Not team and not 1v1
            ctx.font = '20px Torus';
            ctx.fillStyle = '#bbbbbb';
            ctx.fillText(`Avg: ${formatScore(p.avgScore)}`, 600, y + 22);
            ctx.fillText(`Impact: ${(p.impact * 100).toFixed(1)}%`, 600, y + 40);
        }
    }

    ctx.font = '18px Torus';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Generated using RomAI', width / 2, height - 10);

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'multiplayer_scoreboard.png' });
}

async function generate1v1Canvas(players, matchInfo) {
    const canvas = Canvas.createCanvas(1200, 400);
    const ctx = canvas.getContext('2d');

    drawSpaceBackground(ctx, canvas.width, canvas.height);

    const left = players[0];
    const right = players[1];

    const drawSide = async (p, x, align) => {
        const isLeft = align === 'left';
        ctx.save();

        if (p.avatarUrl) {
            try {
                const avatar = await loadImage(p.avatarUrl) ?? undefined;
                ctx.beginPath();
                ctx.arc(x + (isLeft ? 80 : -80), 200, 60, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                if (avatar) ctx.drawImage(avatar, x + (isLeft ? 20 : -140), 140, 120, 120);
                ctx.restore();
            } catch (error) {
                console.log(error);
            }
        }

        ctx.font = '32px Torus-Bold';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = align;
        ctx.fillText(p.username, x, 90);

        if (p.country) {
            const flag = await loadImage(`https://osu.ppy.sh/images/flags/${p.country}.png`);
            const flagY = 70;
            const flagX = align === 'left'
                ? x + ctx.measureText(p.username).width + 10
                : x - 34 - ctx.measureText(p.username).width;
            ctx.drawImage(flag, flagX, flagY, 32, 22);
        }

        ctx.font = '28px Torus SemiBold';
        ctx.fillStyle = getScoreColor(p.score);
        ctx.fillText(`Score: ${p.score}`, x, 300);

        if (p.rank && p.rank.logoUrl) {
            const rankLogo = await loadImage(p.rank.logoUrl);
            const rankSize = 80;
            const offset = isLeft ? -65 : 65;
            const centerX = x + offset;
            const centerY = 230;
        
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, rankSize / 2 + 10, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, rankSize / 2 + 10);
            gradient.addColorStop(0, '#aa80ff');
            gradient.addColorStop(1, '#330066');
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#aa80ff';
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.closePath();
            ctx.clip();
        
            ctx.shadowBlur = 0;
            ctx.drawImage(rankLogo, centerX - rankSize / 2, centerY - rankSize / 2, rankSize, rankSize);
            ctx.restore();
        }

        ctx.font = '20px Torus';
        ctx.fillStyle = '#bbbbbb';
        ctx.fillText(`Avg: ${formatScore(p.avgScore)}`, x, 340);
        ctx.fillText(`Impact: ${(p.impact * 100).toFixed(1)}%`, x, 370);
    };

    await drawSide(left, 300, 'left');
    await drawSide(right, 900, 'right');

    const vsImg = await loadImage('./src/utils/images/multi/blackhole-vs.png');

    const vsWidth = 100; 
    const vsHeight = 100;

    const vsX = (canvas.width - vsWidth) / 2;
    const vsY = (canvas.height - vsHeight) / 2;

    ctx.drawImage(vsImg, vsX, vsY, vsWidth, vsHeight);

    if (matchInfo) {
        ctx.font = '40px Torus-Bold';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${matchInfo[0].teamScore}`, vsX + 125, vsY + 65);
        ctx.fillText(`${matchInfo[1].teamScore}`, vsX - 25, vsY + 65);
    }

    ctx.font = '18px Torus';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Generated using RomAI', canvas.width / 2, canvas.height - 10);

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: '1v1_scoreboard.png' });
}

async function generate1v1Visual(players, matchInfo) {
    return generatePodiumCanvas(players, '1v1', matchInfo);
}

async function generateTeamInDepthVisual(players, teamInfo) {
    const isQualifier = teamInfo ? 'team_in_depth' : false;
    return generatePodiumCanvas(players, isQualifier, teamInfo);
}

async function generateTeamRegularVisual(players, teamInfo) {
    return generatePodiumCanvas(players, 'regular', teamInfo);
}

module.exports = {
    generate1v1Visual,
    generateTeamInDepthVisual,
    generateTeamRegularVisual
};
