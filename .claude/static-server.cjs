const http = require('http');
const fs = require('fs');
const path = require('path');
const port = parseInt(process.argv[2] || '8095');
const root = path.join(__dirname, '..', 'public');

const mimeTypes = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.xml': 'application/xml',
  '.txt': 'text/plain', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(root, url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    // Try .html extension (Quartz outputs Foo.html not foo/index.html)
    const htmlPath = filePath + '.html';
    const parts = url.split('/').filter(Boolean);
    // Try capitalized: /interactive/network-graph → /interactive/Network-Graph.html
    if (parts.length > 0) {
      const dir = path.join(root, ...parts.slice(0, -1));
      const base = parts[parts.length - 1];
      const capitalized = base.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
      const capPath = path.join(dir, capitalized + '.html');
      if (fs.existsSync(capPath)) filePath = capPath;
      else if (fs.existsSync(htmlPath)) filePath = htmlPath;
    } else if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}).listen(port, () => console.log(`Static server on http://localhost:${port}`));
