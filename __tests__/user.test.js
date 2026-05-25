import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/user.model.js'; // Import the User from '../models/user.model.js';

let mongoServer;

export const connect = async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
};      

export const disconnect = async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
};

export const clearCollections = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
};

beforeAll(async () => {
    await connect();
});

afterAll(async () => {
    await disconnect();
});

afterEach(async () => {
    await clearCollections();
});

describe('User Model Test', () => {
    it('should create & save user successfully', async () => {
        const validUser = new User({ name: 'John Doe', email: 'RcT4o@example.com' });
        await validUser.save();
        expect(validUser.name).toBe('John Doe');
        expect(validUser.email).toBe('RcT4o@example.com');
    });
});