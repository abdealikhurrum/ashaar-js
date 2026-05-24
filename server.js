const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const root = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendResponse(res, statusCode, data, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(data);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendResponse(res, 404, '404 Not Found', 'text/plain; charset=utf-8');
      } else {
        sendResponse(res, 500, '500 Internal Server Error', 'text/plain; charset=utf-8');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    sendResponse(res, 200, data, contentType);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const safeUrl = path.normalize(decodeURIComponent(url)).replace(/^\.+/, '');
  let filePath = path.join(root, safeUrl);

  if (safeUrl === '/' || safeUrl === '' || safeUrl === '/demo') {
    filePath = path.join(root, 'demo.html');
  }

  if (!filePath.startsWith(root)) {
    sendResponse(res, 400, '400 Bad Request', 'text/plain; charset=utf-8');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendResponse(res, 404, '404 Not Found', 'text/plain; charset=utf-8');
      } else {
        sendResponse(res, 500, '500 Internal Server Error', 'text/plain; charset=utf-8');
      }
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'demo.html');
      fs.access(indexPath, fs.constants.R_OK, (indexErr) => {
        if (indexErr) {
          sendResponse(res, 403, '403 Forbidden', 'text/plain; charset=utf-8');
        } else {
          sendFile(res, indexPath);
        }
      });
    } else {
      sendFile(res, filePath);
    }
  });
});

server.listen(port, () => {
  console.log(`Local test server running at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.');
});
