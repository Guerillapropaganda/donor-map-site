const http = require('http');
const fs = require('fs');
const path = require('path');
const port = parseInt(process.argv[2] || '8096');

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  let file;
  if (url === '/v2') file = 'landing-v2.html';
  else if (url === '/charts' || url === '/charts.html') file = 'charts.html';
  else if (url === '/memes' || url === '/memes-may-1' || url === '/memes-may-1.html') file = 'memes-may-1.html';
  else if (url === '/home' || url === '/home.html' || url === '/' ) file = 'home.html';
  else if (url === '/class-traitor' || url === '/beat-class-traitor' || url === '/beat-class-traitor.html') file = 'beat-class-traitor.html';
  else if (url === '/three-becerras' || url === '/beat-three-becerras' || url === '/beat-three-becerras.html') file = 'beat-three-becerras.html';
  else if (url === '/chevron' || url === '/beat-chevron' || url === '/beat-chevron.html') file = 'beat-chevron.html';
  else if (url === '/donors-becerra-2026' || url === '/donors-becerra-2026.html') file = 'donors-becerra-2026.html';
  else if (url === '/donors-mahan-2026' || url === '/donors-mahan-2026.html') file = 'donors-mahan-2026.html';
  else if (url === '/share-cards-2026-05-03' || url === '/share-cards-2026-05-03.html' || url === '/share-cards') file = 'share-cards-2026-05-03.html';
  else if (url === '/bianco-ballots' || url === '/beat-bianco-ballots' || url === '/beat-bianco-ballots.html') file = 'beat-bianco-ballots.html';
  else if (url === '/villaraigosa-pledge' || url === '/beat-villaraigosa-pledge' || url === '/beat-villaraigosa-pledge.html') file = 'beat-villaraigosa-pledge.html';
  else if (url === '/bearstar-octopus' || url === '/beat-bearstar-octopus' || url === '/beat-bearstar-octopus.html') file = 'beat-bearstar-octopus.html';
  else if (url === '/mahan' || url === '/beat-mahan' || url === '/beat-mahan.html') file = 'beat-mahan.html';
  else if (url === '/hilton' || url === '/beat-hilton' || url === '/beat-hilton.html') file = 'beat-hilton.html';
  else if (url === '/holdings-hilton-2026' || url === '/holdings-hilton-2026.html') file = 'holdings-hilton-2026.html';
  else if (url === '/steyer' || url === '/beat-steyer' || url === '/beat-steyer.html') file = 'beat-steyer.html';
  else if (url === '/carace26-map' || url === '/race-map' || url === '/beat-carace26-map' || url === '/beat-carace26-map.html') file = 'beat-carace26-map.html';
  else if (url === '/debate-night' || url === '/debate-night-receipts' || url === '/receipts') file = 'debate-night-receipts.html';
  else if (url === '/standby' || url.startsWith('/standby?') || url === '/standby.html') file = 'standby.html';
  else if (url === '/cop-coddler' || url === '/beat-cop-coddler' || url === '/beat-cop-coddler.html') file = 'beat-cop-coddler.html';
  else if (url === '/about' || url === '/about.html') file = 'about.html';
  else if (url === '/investigations' || url === '/investigations/' || url === '/investigations.html') file = 'investigations.html';
  else file = 'landing-v3.html';
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}).listen(port, () => {
  console.log(`Prototype server at http://localhost:${port}`);
});
