import Pusher from 'pusher-js';

class PusherService {
    constructor() {
        this.instances = new Map();
        this.channels = new Map();
        this.config = {
            key: import.meta.env.VITE_PUSHER_APP_KEY || window.pusherKey || '',
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || window.pusherCluster || 'eu',
            forceTLS: true,
            enableStats: false, // Use enableStats instead of deprecated disableStats
            authEndpoint: '/broadcasting/auth',
            auth: {
                headers: {
                    'X-CSRF-TOKEN': document.head?.querySelector('meta[name="csrf-token"]')?.content || '',
                },
            },
        };
    }

    getInstance(key = 'default') {
        if (!this.instances.has(key)) {
            if (!this.config.key) {
                console.error('Pusher app key is not configured. Please check your .env file.');
                return null;
            }
            
            try {
                const instance = new Pusher(this.config.key, {
                    cluster: this.config.cluster,
                    forceTLS: this.config.forceTLS,
                    enableStats: this.config.enableStats,
                    authEndpoint: this.config.authEndpoint,
                    auth: this.config.auth,
                });
                
                // Add connection state logging
                instance.connection.bind('state_change', (states) => {
                    console.log('[PusherService] State changed:', states.previous, '->', states.current);
                    try {
                        if (states.current === 'connected') {
                            window.__pusherSocketId = instance.connection.socket_id;
                        } else if (states.current === 'disconnected' || states.current === 'failed') {
                            window.__pusherSocketId = null;
                        }
                    } catch (_) {}
                });
                
                instance.connection.bind('connected', () => {
                    console.log('[PusherService] Successfully connected');
                    try {
                        window.__pusherSocketId = instance.connection.socket_id;
                        console.log('[PusherService] Socket ID:', window.__pusherSocketId);
                    } catch (_) {}
                });
                
                instance.connection.bind('error', (error) => {
                    console.error('[PusherService] Connection error:', error);
                });
                
                instance.connection.bind('failed', () => {
                    console.warn('[PusherService] Connection failed (all strategies exhausted)');
                });
                
                this.instances.set(key, instance);
                console.log('Pusher instance created with key:', this.config.key.substring(0, 10) + '...');
            } catch (error) {
                console.error('Failed to initialize Pusher:', error);
                return null;
            }
        }
        return this.instances.get(key);
    }

    subscribe(channelName) {
        if (!channelName) {
            console.error('Channel name is required');
            return null;
        }

        const instance = this.getInstance();
        if (!instance) {
            console.error('Cannot subscribe: Pusher instance not available');
            return null;
        }

        // Check if already subscribed to this channel
        if (this.channels.has(channelName)) {
            console.log('[PusherService] Already subscribed to channel:', channelName);
            return this.channels.get(channelName);
        }

        try {
            const channel = instance.subscribe(channelName);
            this.channels.set(channelName, channel);
            console.log('[PusherService] Subscribed to new channel:', channelName);
            return channel;
        } catch (error) {
            console.error('Failed to subscribe to channel:', channelName, error);
            return null;
        }
    }

    unsubscribe(channelName) {
        if (!channelName) return;

        if (this.channels.has(channelName)) {
            try {
                const channel = this.channels.get(channelName);
                if (channel) {
                    // First unbind all events to prevent memory leaks
                    channel.unbind_all();
                    // Then unsubscribe
                    const instance = this.getInstance();
                    if (instance && instance.unsubscribe) {
                        instance.unsubscribe(channelName);
                    }
                    console.log('[PusherService] Unsubscribed from channel:', channelName);
                }
            } catch (error) {
                console.error('Error unsubscribing from channel:', channelName, error);
            } finally {
                this.channels.delete(channelName);
            }
        }
        
        // Clean up instance if no more channels
        if (this.channels.size === 0) {
            this.instances.forEach((instance, key) => {
                try {
                    instance.disconnect();
                    console.log('Disconnected Pusher instance:', key);
                } catch (error) {
                    console.error('Error disconnecting Pusher instance:', key, error);
                }
                this.instances.delete(key);
            });
        }
    }

    disconnect() {
        try {
            this.channels.forEach((_, name) => this.unsubscribe(name));
            console.log('PusherService disconnected');
        } catch (error) {
            console.error('Error disconnecting PusherService:', error);
        }
    }
}

// Create a singleton instance
const pusherService = new PusherService();

export default pusherService;
