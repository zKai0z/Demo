const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '192.0.0.2';
const port = 3000;

const htmlDirectory = path.join(__dirname, 'html');
const server = http.createServer(function (req, res) {
    const filePath = path.join(htmlDirectory,'home.html');
    fs.readFile(filePath, function (error, data) {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.write('Error: File Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(data);
        }
        res.end();
    });
});

server.listen(port, function (error) {
    if (error) {
        console.log('Something went wrong');
    } else {
        console.log(`Server is running at http://${hostname}:${port}`);
    }
});
