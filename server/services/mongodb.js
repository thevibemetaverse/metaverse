const { MongoClient } = require('mongodb');

class MongoDBService {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.collectionPrefix = process.env.NODE_ENV === 'production' ? '_prod' : '_dev';
    }

    async connect() {
        try {
            // Get MongoDB credentials from environment variables
            const username = process.env.MONGODB_USERNAME;
            const password = process.env.MONGODB_PASSWORD;

            if (!username || !password) {
                throw new Error('MongoDB credentials not found in environment variables');
            }

            // Construct connection string with authentication
            const connectionString = `mongodb+srv://${username}:${password}@cluster0.bhul9.mongodb.net`;
            
            this.client = new MongoClient(connectionString, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            await this.client.connect();
            this.db = this.client.db('vibemetaverse');
            this.isConnected = true;
            console.log('[MongoDB] Successfully connected to database');
        } catch (error) {
            console.error('[MongoDB] Connection error:', error);
            this.isConnected = false;
            throw error;
        }
    }

    getCollection(name) {
        if (!this.isConnected) {
            throw new Error('MongoDB not connected');
        }
        return this.db.collection(`${name}${this.collectionPrefix}`);
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            console.log('[MongoDB] Connection closed');
        }
    }

    // Helper method to safely execute database operations with fallback
    async executeWithFallback(operation, fallbackValue) {
        try {
            if (!this.isConnected) {
                console.warn('[MongoDB] Database not connected, using fallback value');
                return fallbackValue;
            }
            return await operation();
        } catch (error) {
            console.error('[MongoDB] Operation error:', error);
            return fallbackValue;
        }
    }
}

// Create and export a singleton instance
const mongodbService = new MongoDBService();
module.exports = mongodbService; 