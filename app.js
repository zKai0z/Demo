const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const hostname = '192.168.1.202';
const port = 3000;

const Demo = path.join(__dirname, 'Project-A');
const htmlDirectory = path.join(Demo, 'html');

const getContentType = (filePath) => {
    const ext = path.extname(filePath);
    switch (ext) {
        case '.html': return 'text/html';
        case '.css': return 'text/css';
        case '.js': return 'application/javascript';
        case '.png': return 'image/png';
        case '.jpg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        default: return 'text/plain';
    }
};

const server = http.createServer((req, res) => {

    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    let requestedFile = pathname === '/' ? '/home.html' : pathname;
    const filePath = path.join(htmlDirectory, requestedFile);

    if (!filePath.startsWith(htmlDirectory)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Error: File Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': getContentType(filePath) });
            res.end(data);
        }
    });
});

server.listen(port, () => {
    console.log(`Server is running at http://${hostname}:${port}`);
});