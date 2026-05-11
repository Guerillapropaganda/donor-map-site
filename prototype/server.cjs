const http = require('http');
const fs = require('fs');
const path = require('path');
const port = parseInt(process.argv[2] || '8096');

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  let file;
  if (url === '/charts' || url === '/charts.html') file = 'charts.html';
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
  else if (url === '/the-hedge' || url === '/beat-the-hedge' || url === '/beat-the-hedge.html' || url === '/hedge') file = 'beat-the-hedge.html';
  else if (url === '/the-apparatus' || url === '/beat-the-apparatus' || url === '/beat-the-apparatus.html' || url === '/apparatus' || url === '/steadfast') file = 'beat-the-apparatus.html';
  else if (url === '/cop-coddler' || url === '/beat-cop-coddler' || url === '/beat-cop-coddler.html') file = 'beat-cop-coddler.html';
  else if (url === '/spencer-pratt' || url === '/pratt' || url === '/new-caruso' || url === '/beat-spencer-pratt' || url === '/beat-spencer-pratt.html') file = 'beat-spencer-pratt.html';
  else if (url === '/clean-cash' || url === '/beat-clean-cash' || url === '/beat-clean-cash.html') file = 'beat-clean-cash.html';
  else if (url === '/second-floor' || url === '/the-second-floor' || url === '/mission-inn' || url === '/beat-second-floor' || url === '/beat-second-floor.html') file = 'beat-second-floor.html';
  else if (url === '/airbnb-bass' || url === '/wesson-pipeline' || url === '/beat-airbnb-bass' || url === '/beat-airbnb-bass.html') file = 'beat-airbnb-bass.html';
  else if (url === '/coachella-data-center' || url === '/stronghold' || url === '/beat-coachella-data-center' || url === '/beat-coachella-data-center.html') file = 'beat-coachella-data-center.html';
  else if (url === '/iehp-320m' || url === '/iehp' || url === '/beat-iehp-320m' || url === '/beat-iehp-320m.html') file = 'beat-iehp-320m.html';
  else if (url === '/pechanga-money' || url === '/pechanga' || url === '/beat-pechanga-money' || url === '/beat-pechanga-money.html') file = 'beat-pechanga-money.html';
  else if (url === '/calvert-earmarks' || url === '/calvert' || url === '/beat-calvert-earmarks' || url === '/beat-calvert-earmarks.html') file = 'beat-calvert-earmarks.html';
  else if (url === '/about' || url === '/about.html') file = 'about.html';
  else if (url === '/investigations' || url === '/investigations/' || url === '/investigations.html') file = 'investigations.html';
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>404 · The Donor Map prototype</title><style>body{font-family:'Inter',sans-serif;background:#f5f0eb;color:#0a0a0a;padding:60px 32px;max-width:720px;margin:0 auto;line-height:1.5}h1{font-weight:900;font-size:48px;letter-spacing:-2px;margin-bottom:18px}code{background:#ece6dd;padding:2px 6px;font-family:'Space Mono',monospace}a{color:#1d4ed8}</style></head><body><h1>404 · No such route</h1><p>No prototype HTML matched <code>${url.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]))}</code>.</p><p>If a beat lives at this slug elsewhere, register it in <code>prototype/server.cjs</code> first.</p><p><a href="/">→ Home</a> &nbsp; <a href="/investigations">→ Investigations</a></p></body></html>`);
    return;
  }
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}).listen(port, () => {
  console.log(`Prototype server at http://localhost:${port}`);
});
