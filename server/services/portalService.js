const mongodbService = require('./mongodb');

class PortalService {
    constructor() {
        this.portalLikes = new Map(); // In-memory cache
        this.userPortalLikes = new Map(); // In-memory cache
        this.dailyVisitors = new Set(); // In-memory cache for daily visitors
        this.lastResetDate = new Date().toDateString();
    }

    async initialize() {
        try {
            // Load user likes from database
            const userLikesCollection = mongodbService.getCollection('userLikes');
            const userLikes = await userLikesCollection.find({}).toArray();
            userLikes.forEach(userLike => {
                this.userPortalLikes.set(userLike.userId, new Set(userLike.likedPortals));
            });

            // Load daily visitors from database
            const visitorsCollection = mongodbService.getCollection('visitors');
            const today = new Date().toDateString();
            const visitors = await visitorsCollection.findOne({ date: today });
            if (visitors) {
                this.dailyVisitors = new Set(visitors.visitorIds);
                this.lastResetDate = today;
            }

            console.log('[PortalService] Successfully initialized with database data');
        } catch (error) {
            console.error('[PortalService] Initialization error:', error);
        }
    }

    async handlePortalLike(userId, portalId) {
        return mongodbService.executeWithFallback(async () => {
            // Check if user has already liked this portal
            const userLikes = this.userPortalLikes.get(userId) || new Set();
            if (userLikes.has(portalId)) {
                return false;
            }

            // Update in-memory cache
            userLikes.add(portalId);
            this.userPortalLikes.set(userId, userLikes);

            // Update database
            const userLikesCollection = mongodbService.getCollection('userLikes');
            await userLikesCollection.updateOne(
                { userId },
                { $set: { likedPortals: Array.from(userLikes) } },
                { upsert: true }
            );

            return true;
        }, false);
    }

    async trackVisitor(visitorId) {
        return mongodbService.executeWithFallback(async () => {
            const today = new Date().toDateString();
            
            // Reset daily visitors if it's a new day
            if (today !== this.lastResetDate) {
                this.dailyVisitors.clear();
                this.lastResetDate = today;
            }

            // Check if visitor is already counted today
            if (this.dailyVisitors.has(visitorId)) {
                return false;
            }

            // Update in-memory cache
            this.dailyVisitors.add(visitorId);

            // Update database
            const visitorsCollection = mongodbService.getCollection('visitors');
            await visitorsCollection.updateOne(
                { date: today },
                { $addToSet: { visitorIds: visitorId } },
                { upsert: true }
            );

            return true;
        }, false);
    }

    getPortalLikeCount(portalId) {
        // Count likes from userLikes collection instead of portalLikes
        let count = 0;
        for (const userLikes of this.userPortalLikes.values()) {
            if (userLikes.has(portalId)) {
                count++;
            }
        }
        return count;
    }

    getDailyVisitorCount() {
        return this.dailyVisitors.size;
    }

    hasUserLikedPortal(userId, portalId) {
        const userLikes = this.userPortalLikes.get(userId);
        return userLikes ? userLikes.has(portalId) : false;
    }

    getUserLikedPortals(userId) {
        return Array.from(this.userPortalLikes.get(userId) || new Set());
    }
}

// Create and export a singleton instance
const portalService = new PortalService();
module.exports = portalService; 