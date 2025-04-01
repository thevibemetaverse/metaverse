class ClientIdService {
    constructor() {
        this.clientId = this.getOrCreateClientId();
    }

    getOrCreateClientId() {
        let clientId = localStorage.getItem('vibe_client_id');
        if (!clientId) {
            clientId = this.generateClientId();
            localStorage.setItem('vibe_client_id', clientId);
        }
        return clientId;
    }

    generateClientId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `vibe_${timestamp}_${randomStr}`;
    }

    getClientId() {
        return this.clientId;
    }
}

// Create and export a singleton instance
const clientIdService = new ClientIdService();
export default clientIdService; 