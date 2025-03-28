const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { MongoClient, ObjectId } = require("mongodb");

const port = 3000;
const mongoURI = "mongodb+srv://Tyn:admin0123@cluster0.9lmma.mongodb.net/";
const client = new MongoClient(mongoURI);
let dbUser, dbStory;

async function connectDB() {
    try {
        await client.connect();
        dbUser = client.db("User");     
        dbStory = client.db("storyDB"); 
        console.log("✅ Kết nối MongoDB thành công!");
    } catch (error) {
        console.error("❌ Lỗi kết nối MongoDB:", error);
        process.exit(1); 
    }
}

let storyCache = [];

async function loadStoriesCache() {
    try {
        if (!dbStory) throw new Error("Database storyDB chưa kết nối!");
        storyCache = await dbStory.collection("story").find().toArray();
        console.log("✅ Đã tải cache truyện!");
    } catch (error) {
        console.error("❌ Lỗi cache dữ liệu truyện:", error);
    }
}

async function getStories() {
    return storyCache;
}

const Demo = path.join(__dirname, "Project-A");
const htmlDirectory = path.join(Demo, "html");

const getContentType = (filePath) => {
    const ext = path.extname(filePath);
    const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif"
    };
    return types[ext] || "text/plain";
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API Đăng ký
    if (req.method === "POST" && pathname === "/api/signup") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { username, email, password, birthday, gender } = JSON.parse(body);
    
                if (!dbUser) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Database User chưa kết nối!" }));
                }
    
                // Kiểm tra username hoặc email đã tồn tại chưa
                const existingUser = await dbUser.collection("users").findOne({
                    $or: [{ username }, { email }]
                });
    
                if (existingUser) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Username or email already exists" }));
                }
    
                // Kiểm tra giá trị đầu vào
                const newUser = {
                    username,
                    email,
                    password,
                    birthday: birthday || "", // Nếu không có, gán rỗng hoặc một giá trị mặc định
                    gender: gender || "Other", // Mặc định là "Other"
                    followedStories: [],
                    history: []
                };
    
                // Thêm user vào database
                await dbUser.collection("users").insertOne(newUser);
    
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "User registered successfully" }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Internal Server Error", error: error.message }));
            }
        });
        return;
    }
    

    // API Đăng nhập
    if (req.method === "POST" && pathname === "/api/signin") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { username, password } = JSON.parse(body);

                if (!dbUser) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Database User chưa kết nối!" }));
                }

                // Kiểm tra user có tồn tại không
                const user = await dbUser.collection("users").findOne({ username });
                if (!user) {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Invalid credentials" }));
                }

                // So sánh mật khẩu (không bảo mật, nên sử dụng bcrypt nếu cần)
                if (user.password !== password) {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Invalid credentials" }));
                }

                // Tạo sessionId để quản lý phiên đăng nhập
                const sessionId = new ObjectId().toHexString();
                await dbUser.collection("sessions").insertOne({
                    sessionId,
                    userId: user._id,
                    createdAt: new Date()
                });

                // Gửi phản hồi, chỉ bao gồm thông tin an toàn
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    message: "Login successful",
                    sessionId,
                    user: {
                        userId: user._id,
                        username: user.username,
                        email: user.email,
                        birthday: user.birthday || "",
                        gender: user.gender || ""
                    }
                }));
            } catch (error) {
                if (!res.writableEnded) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: "Internal Server Error", error: error.message }));
                }
            }
        });
        return;
    }

    
    // API kiểm tra đăng nhập
    if (req.url === "/api/check-login" && req.method === "GET") {
        const sessionId = req.headers["authorization"];

        if (!sessionId) {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ loggedIn: false, message: "Unauthorized" }));
        }

        const session = await dbUser.collection("sessions").findOne({ sessionId });
        if (!session) {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ loggedIn: false, message: "Session expired" }));
        }

        const user = await dbUser.collection("users").findOne({ _id: new ObjectId(session.userId) });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ loggedIn: true, user }));
    }
    
    // API Lấy thông tin user
    if (pathname === "/api/user" && req.method === "GET") {
        const userId = parsedUrl.query.id;
        console.log("Requested user ID:", userId, typeof userId); // Debugging log

        if (!ObjectId.isValid(userId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "Invalid user ID" }));
        }
        // Convert only if it's a valid ObjectId
        const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };

        const user = await dbUser.collection("users").findOne(query);
        if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "User not found" }));
        }
        res.writeHead(200, { 
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        });
        
        res.end(JSON.stringify(user));
        return;
    }

    // API Cập nhật thông tin User
    if (req.method === "PUT" && pathname === "/api/user") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { id } = url.parse(req.url, true).query; // Lấy ID từ URL
                if (!id) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "User ID không hợp lệ" }));
                }

                const { username, email, birthday, gender } = JSON.parse(body);

                // Cập nhật dữ liệu trong database
                await dbUser.collection("users").updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { username, email, birthday, gender } }
                );

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Cập nhật thành công" }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Lỗi server", error: error.message }));
            }
        });
        return;
    }

    // API Lấy danh sách truyện
    if (pathname === "/api/stories" && req.method === "GET") {
        const stories = await getStories();
        res.writeHead(200, { 
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        });        
        res.end(JSON.stringify(stories));
        return;
    }

    // API Update followedStories cho user
    if (req.method === "PUT" && pathname.startsWith("/api/user/") && pathname.endsWith("/followedStories")) {
        const parts = pathname.split("/");
        const userId = parts[3]; 

        if (!ObjectId.isValid(userId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "Invalid user ID" }));
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { followedStories } = JSON.parse(body);

                const result = await dbUser.collection("users").updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { followedStories } }
                );

                if (result.modifiedCount === 1) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Updated followed stories" }));
                } else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "No changes made" }));
                }
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ message: "Internal server error", error: error.message }));
            }
        });
        return;
    }
    
    // update history
    if (req.method === "PUT" && pathname.startsWith("/api/user/") && pathname.endsWith("/history")) {
        const parts = pathname.split("/");
        const userId = parts[3]; 

        if (!ObjectId.isValid(userId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "Invalid user ID" }));
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { history } = JSON.parse(body);

                const result = await dbUser.collection("users").updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { history } }
                );

                if (result.modifiedCount === 1) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Updated history" }));
                } else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "No changes made" }));
                }
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ message: "Internal server error", error: error.message }));
            }
        });
        return;
    }
    
    // Phục vụ file tĩnh
    let requestedFile = pathname === "/" ? "/home.html" : pathname;
    const filePath = path.join(htmlDirectory, requestedFile);

    if (!filePath.startsWith(htmlDirectory)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden");
        return;
    }

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Error: File Not Found");
        }
    
        res.writeHead(200, { "Content-Type": getContentType(filePath) });
        fs.createReadStream(filePath).pipe(res);
    });    
});

// Kết nối MongoDB và khởi chạy server
connectDB().then(() => {
    loadStoriesCache();
    server.listen(port, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
    });
});
