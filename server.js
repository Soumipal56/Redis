import "dotenv/config";
import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import Redis from "ioredis";
import { User } from "./models/user.model.js";

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

redis.once("ready", () => {
    console.log("Connected to Redis");
})

// Create Express app
const app = express();
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.get("/user/:id", async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });
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


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});