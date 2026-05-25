import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../server.js";
import { User } from "../models/user.model.js";

let mongoServer;
let server;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await mongoose.connection.db.dropDatabase();

    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
		server = undefined;
    }
});

describe("User routes", () => {
    it("returns 404 when the user does not exist", async () => {
        const app = createApp({ redisClient: null });
        server = app.listen(0);

        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/user/${new mongoose.Types.ObjectId()}`);

        expect(response.status).toBe(404);

        const body = await response.json();
        expect(body.message).toBe("User not found");
    });

    it("returns 400 when the user id is invalid", async () => {
        const app = createApp({ redisClient: null });
        server = app.listen(0);

        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/user/not-a-valid-id`);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.message).toBe("Invalid user id");
    });
});

describe("User Model Test", () => {
    it("should create & save user successfully", async () => {
        const validUser = new User({ name: "John Doe", email: "RcT4o@example.com" });
        await validUser.save();

        expect(validUser.name).toBe("John Doe");
        expect(validUser.email).toBe("RcT4o@example.com");
    });
});