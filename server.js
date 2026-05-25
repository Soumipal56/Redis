import "dotenv/config";
import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import Redis from "ioredis";
import { User } from "./models/user.model.js";
import rateLimit from "express-rate-limit";

// Connect to MongoDB
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectToMongoDB();

// Connect to Redis
const redis = new Redis(process.env.REDIS_URI)

console.log("REDIS_URI:", process.env.REDIS_URI); // Add this line

redis.once("ready", () => {
    console.log("Connected to Redis");
})

// Create Express app
const app = express();
app.use(morgan("dev"));
app.use(express.json());

const globalRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests, please try again later.",
    },
    statusCode: 429, // Set status code to 429
    smartHeaders: true,
    legacyHeaders: false,
});

app.use(globalRateLimiter);

// Routes
app.get("/user/:id", async (req, res) => {
    try {

        const userFromCache = await redis.get(`user:${req.params.id}`);
        if (userFromCache) {
            return res.json({
                message: "User fetched from cache",
                data: JSON.parse(userFromCache),
            })
        }

        const user = await User.findOne({ _id: req.params.id });

        await redis.set(`user:${req.params.id}`, JSON.stringify(user), "EX", 3600); // Cache for 1 hour
        res.json({
            message: "User fetched successfully",
            data: user,
        })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.post("/user", async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({
            message: "User created successfully",
            data: newUser,
        })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.get("/", async (req, res) => {
    let sum = 0;
    for (let i = 0; i < 10000000000; i++) {
        sum += i;
    }
    res.json({ message: "Sum calculated", data: sum });
})


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});