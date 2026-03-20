const fs = require('fs');
let text = fs.readFileSync('src/App.jsx', 'utf-8');

const colorMap = {
    // Ambers/Oranges to Pastel Pinks
    '#f59e0b': '#dfb2c4',
    '#ea580c': '#c98298',
    '#d97706': '#b07084',
    '#78350f': '#5e4d52',
    '#fef3c7': '#f7ebee',
    '#fde68a': '#f2d5df',

    // Blues to Warm Slate/Gray
    '#0ea5e9': '#a8b6c4',
    '#0284c7': '#8f9fb0',
    '#3b82f6': '#a29ea8',
    '#2563eb': '#89858f',
    '#e0f2fe': '#f2f0f2',
    '#bae6fd': '#e1dfe3',
    '#0369a1': '#68646b',

    // Purples to Mauve
    '#8b5cf6': '#c0aab5',

    // Greens to Pastel Sage
    '#16a34a': '#9fb5a6',
    '#10b981': '#a0bfa9',
    '#15803d': '#889e8f',
    '#dcfce7': '#eef5f0',

    // Reds to Pastel Rose
    '#dc2626': '#d99494',
    '#fee2e2': '#fae1e1',

    // Neutrals to warm gray/pinkish
    '#f8fafc': '#fcfbfb',
    '#f1f5f9': '#faf8f9',
    '#e2e8f0': '#ece9ea',
    '#cbd5e1': '#dbd6d8',
    '#94a3b8': '#b8b1b3',
    '#64748b': '#968f92',
    '#475569': '#787073',
    '#334155': '#595053',
    '#1e293b': '#4a4144',
    '#0f172a': '#3b3235',

    // Rgba focus variants
    'rgba(59, 130, 246, 0.2)': 'rgba(223, 178, 196, 0.2)',
    'rgba(234, 88, 12, 0.2)': 'rgba(201, 130, 152, 0.2)',
    'rgba(37, 99, 235, 0.2)': 'rgba(137, 133, 143, 0.2)',
    'rgba(22, 163, 74, 0.2)': 'rgba(159, 181, 166, 0.2)',
    'rgba(37,99,235,0.2)': 'rgba(137, 133, 143, 0.2)'
};

for (const [oldColor, newColor] of Object.entries(colorMap)) {
    text = text.split(oldColor).join(newColor);
}

// Remove the refresh button
text = text.replace(/<button[^>]+onClick=\{fetchPrices\}[^>]+>⟳<\/button>/g, '');

// Change the App Title
text = text.replace(/PORTFOLIO TRACKER/g, 'PORTFOLIO GERMAN');

fs.writeFileSync('src/App.jsx', text);
console.log('Colors replaced, button removed, and title updated!');
