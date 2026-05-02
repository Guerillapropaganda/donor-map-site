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
  else file = 'landing-v3.html';
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}).listen(port, () => {
  console.log(`Prototype server at http://localhost:${port}`);
});
