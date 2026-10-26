const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const root = __dirname, types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/plain' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d); });
}).listen(8000, '0.0.0.0', () => {
  console.log('\nRAVUNIX server chal raha hai. Is window ko band mat karo.\n\nIs PC par:        http://localhost:8000');
  for (const l of Object.values(os.networkInterfaces())) for (const a of l) if (a.family === 'IPv4' && !a.internal) console.log('Dusre device par: http://' + a.address + ':8000   (same WiFi)');
  console.log('\nFirewall poochhe to "Allow access" dabao.\n');
});
