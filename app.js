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

/*const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const port = 3000;
const hostname = "192.168.1.202";

// Connect to MongoDB
try {
    mongoose.connect("mongodb://localhost:27017/mydatabase", {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Connected to MongoDB");
} catch (error) {
    console.error("MongoDB connection error:", error);
}

// Define Story Schema & Model
const StorySchema = new mongoose.Schema({
    title: String,
    image: String,
    chapters: Number,
    views: String,
    followers: String
});
const Story = mongoose.model("Story", StorySchema);

// Serve static files (HTML, CSS, JS, Images)
const projectDir = path.join(__dirname, "Project-A");
app.use(express.static(path.join(projectDir, "html")));
app.use("/css", express.static(path.join(projectDir, "css")));

// API route to fetch stories
app.get("/api/stories", async (req, res) => {
    try {
        const stories = await Story.find();
        res.json(stories);
    } catch (error) {
        res.status(500).json({ error: "Error fetching stories" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});
*/