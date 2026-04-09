const http = require('http');
const fs = require('fs');
const path = require('path');
const port = parseInt(process.argv[2] || '8096');

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  let file = url === '/v2' ? 'landing-v2.html' : 'landing-v3.html';
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}).listen(port, () => {
  console.log(`Prototype server at http://localhost:${port}`);
});
