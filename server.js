import "dotenv/config";
import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import Redis from "ioredis";
import { User } from "./models/user.model.js";
import rateLimit from "express-rate-limit";

export const connectToMongoDB = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
};

const createRedisClient = () => {
    const redis = new Redis(process.env.REDIS_URI);

    redis.once("ready", () => {
        console.log("Connected to Redis");
    });

    redis.once("error", (error) => {
        console.error("Redis connection error:", error.message);
    });

    return redis;
};

const safeParseCachedUser = (value) => {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const shouldUseRedis = process.env.NODE_ENV !== "test" && Boolean(process.env.REDIS_URI);

export const createApp = ({ redisClient = shouldUseRedis ? createRedisClient() : null, userModel = User } = {}) => {
    const app = express();

    app.use(morgan("dev"));
    app.use(express.json());

    app.set("view engine", "ejs");
    app.set("views", "./views");

    const globalRateLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 100,
        message: {
            error: "Too many requests, please try again later.",
        },
        statusCode: 429,
        standardHeaders: true,
    });

    app.use(globalRateLimiter);

    app.get("/user/:id", async (req, res) => {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid user id",
                data: null,
            });
        }

        try {
            let cachedUser = null;

            if (redisClient?.get) {
                try {
                    cachedUser = safeParseCachedUser(await redisClient.get(`user:${id}`));
                } catch {
                    cachedUser = null;
                }
            }

            if (cachedUser) {
                return res.json({
                    message: "User fetched from cache",
                    data: cachedUser,
                });
            }

            const user = await userModel.findById(id);

            if (!user) {
                return res.status(404).json({
                    message: "User not found",
                    data: null,
                });
            }

            if (redisClient?.set) {
                try {
                    await redisClient.set(`user:${id}`, JSON.stringify(user), "EX", 3600);
                } catch {
                    // Ignore Redis write failures so the request can still succeed.
                }
            }

            return res.json({
                message: "User fetched successfully",
                data: user,
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });

    app.post("/user", async (req, res) => {
        try {
            const newUser = new userModel(req.body);
            await newUser.save();
            res.json({
                message: "User created successfully",
                data: newUser,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/", async (req, res) => {
        res.render("index");
    });

    return app;
};

export const app = createApp();

export const startServer = async () => {
    await connectToMongoDB();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

if (process.env.NODE_ENV !== "test") {
    startServer().catch((error) => {
        console.error("Error starting server:", error);
        process.exit(1);
    });
}