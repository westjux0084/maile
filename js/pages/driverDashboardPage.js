import tripService from '../services/tripService.js';
import authService from '../services/authService.js';
import { showToast } from '../utils/uiHelper.js';

class DriverDashboardPage {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.isOnline = false;
        this.currentTrip = null;
        this.availableTrips = [];
    }

    async init() {
        const app = document.getElementById('app');
        app.innerHTML = this.render();
        
        await this.initializeMap();
        await this.getCurrentLocation();
        await this.loadAvailableTrips();
        this.attachEventListeners();
        
        // Subscribe to new trip requests
        this.subscribeToTrips();
    }

    render() {
        return `
            <div class="page">
                <header class="header">
                    <div class="container header-content">
                        <a href="/" class="logo">🚗 RideShare</a>
                        <nav>
                            <ul class="nav-menu">
                                <li><a href="#" class="nav-link">Dashboard</a></li>
                                <li><a href="#" class="nav-link">Earnings</a></li>
                                <li><a href="#" class="nav-link">Trips</a></li>
                                <li><a href="#" class="nav-link" onclick="authService.signOut()">Logout</a></li>
                            </ul>
                        </nav>
                    </div>
                </header>
                
                <div class="container page-content">
                    <div class="driver-dashboard">
                        <div class="driver-map-section">
                            <div id="driver-map"></div>
                        </div>
                        
                        <div class="driver-panel">
                            ${this.renderDriverStatus()}
                            ${this.renderEarningsCard()}
                            ${this.currentTrip ? this.renderActiveTrip() : this.renderTripRequests()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDriverStatus() {
        return `
            <div class="driver-status-card">
                <div class="status-toggle">
                    <div>
                        <span class="status-indicator ${this.isOnline ? '' : 'offline'}"></span>
                        <span>${this.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <button class="btn ${this.isOnline ? 'btn-danger' : 'btn-primary'}" 
                            onclick="window.driverDashboard.toggleOnlineStatus()">
                        ${this.isOnline ? 'Go Offline' : 'Go Online'}
                    </button>
                </div>
                ${this.isOnline ? '<p>You\'re visible to customers nearby</p>' : '<p>You\'re not accepting ride requests</p>'}
            </div>
        `;
    }

    renderEarningsCard() {
        return `
            <div class="earnings-card">
                <div class="earnings-amount">$245.80</div>
                <div class="earnings-period">Today's earnings</div>
                <div class="earnings-stats">
                    <div class="earnings-stat">
                        <div class="earnings-stat-value">12</div>
                        <div class="earnings-stat-label">Trips</div>
                    </div>
                    <div class="earnings-stat">
                        <div class="earnings-stat-value">4.8</div>
                        <div class="earnings-stat-label">Rating</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTripRequests() {
        if (this.availableTrips.length === 0) {
            return `
                <div class="card text-center p-4">
                    <h3>No trip requests</h3>
                    <p class="text-light mb-3">Waiting for ride requests...</p>
                    <div class="spinner" style="margin: 0 auto;"></div>
                </div>
            `;
        }
        
        return `
            <h4 class="section-title mb-2">Trip Requests</h4>
            <div class="trip-requests">
                ${this.availableTrips.map(trip => this.renderTripRequest(trip)).join('')}
            </div>
        `;
    }

    renderTripRequest(trip) {
        return `
            <div class="trip-request-card">
                <div class="trip-request-header">
                    <div>
                        <h4>${trip.ride_type} ride</h4>
                        <span class="text-light">${trip.distance} km</span>
                    </div>
                    <div class="trip-fare">$${trip.estimated_cost}</div>
                </div>
                
                <div class="trip-route">
                    <div class="route-point">
                        <div class="route-icon pickup-icon">📍</div>
                        <span class="route-address">${trip.pickup_location}</span>
                    </div>
                </div>
                
                <div class="trip-route">
                    <div class="route-point">
                        <div class="route-icon dropoff-icon">🎯</div>
                        <span class="route-address">${trip.dropoff_location}</span>
                    </div>
                </div>
                
                <div class="trip-actions">
                    <button class="btn btn-outline" onclick="window.driverDashboard.rejectTrip('${trip.id}')">
                        Reject
                    </button>
                    <button class="btn btn-primary" onclick="window.driverDashboard.acceptTrip('${trip.id}')">
                        Accept
                    </button>
                </div>
            </div>
        `;
    }

    renderActiveTrip() {
        return `
            <div class="active-trip-card">
                <h3 class="mb-3">Active Trip</h3>
                
                <div class="passenger-info">
                    <div class="passenger-avatar">JD</div>
                    <div class="passenger-details">
                        <h4>John Doe</h4>
                        <div class="passenger-rating">⭐ 4.8</div>
                    </div>
                </div>
                
                <div class="trip-status">
                    <div class="status-step completed">
                        <span class="status-icon completed">✓</span>
                        <span>Trip accepted</span>
                    </div>
                    <div class="status-step ${this.currentTrip.status === 'enRoute' || this.currentTrip.status === 'arrived' || this.currentTrip.status === 'inProgress' ? 'completed' : ''}">
                        <span class="status-icon ${this.currentTrip.status === 'enRoute' || this.currentTrip.status === 'arrived' || this.currentTrip.status === 'inProgress' ? 'completed' : 'pending'}">
                            ${this.currentTrip.status === 'enRoute' || this.currentTrip.status === 'arrived' || this.currentTrip.status === 'inProgress' ? '✓' : '○'}
                        </span>
                        <span>Heading to pickup</span>
                    </div>
                    <div class="status-step ${this.currentTrip.status === 'inProgress' ? 'completed' : ''}">
                        <span class="status-icon ${this.currentTrip.status === 'inProgress' ? 'completed' : 'pending'}">
                            ${this.currentTrip.status === 'inProgress' ? '✓' : '○'}
                        </span>
                        <span>Picked up passenger</span>
                    </div>
                </div>
                
                <div class="trip-actions mt-3">
                    <button class="btn btn-secondary" onclick="window.driverDashboard.callPassenger()">
                        📞 Call
                    </button>
                    <button class="btn btn-primary" onclick="window.driverDashboard.updateTripStatus()">
                        ${this.getNextAction()}
                    </button>
                </div>
            </div>
        `;
    }

    async initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('driver-map').setView([40.7128, -74.0060], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    async getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Update map view
                    this.map.setView([currentLocation.lat, currentLocation.lng], 15);
                    
                    // Add driver marker
                    if (this.userMarker) {
                        this.map.removeLayer(this.userMarker);
                    }
                    
                    this.userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
                        icon: L.divIcon({
                            className: 'driver-marker',
                            html: '🚗',
                            iconSize: [30, 30]
                        })
                    }).addTo(this.map);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    showToast('Could not get your location', 'error');
                }
            );
        }
    }

    async toggleOnlineStatus() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        this.isOnline = !this.isOnline;
        
        await authService.updateOnlineStatus(user.id, this.isOnline);
        
        showToast(this.isOnline ? 'You\'re now online' : 'You\'re now offline', 'success');
        this.init();
    }

    async loadAvailableTrips() {
        const result = await tripService.getAvailableTrips();
        
        if (result.success) {
            this.availableTrips = result.data;
            this.init();
        }
    }

    async acceptTrip(tripId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const result = await tripService.acceptTrip(tripId, user.id);
        
        if (result.success) {
            this.currentTrip = result.data;
            showToast('Trip accepted!', 'success');
            
            // Update trip status
            await tripService.updateTripStatus(tripId, 'enRoute');
            
            this.init();
        } else {
            showToast(result.error, 'error');
        }
    }

    async rejectTrip(tripId) {
        this.availableTrips = this.availableTrips.filter(t => t.id !== tripId);
        showToast('Trip rejected', 'info');
        this.init();
    }

    async updateTripStatus() {
        if (!this.currentTrip) return;
        
        const statusMap = {
            'enRoute': 'arrived',
            'arrived': 'inProgress',
            'inProgress': 'completed'
        };
        
        const nextStatus = statusMap[this.currentTrip.status];
        
        const result = await tripService.updateTripStatus(this.currentTrip.id, nextStatus);
        
        if (result.success) {
            this.currentTrip = result.data;
            showToast(`Trip ${nextStatus}!`, 'success');
            
            if (nextStatus === 'completed') {
                showToast('Trip completed! Great job! 🎉', 'success');
                this.currentTrip = null;
            }
            
            this.init();
        } else {
            showToast(result.error, 'error');
        }
    }

    getNextAction() {
        const actions = {
            'enRoute': 'Arrived at Pickup',
            'arrived': 'Start Trip',
            'inProgress': 'Complete Trip'
        };
        return actions[this.currentTrip.status] || 'Update Status';
    }

    callPassenger() {
        showToast('Calling passenger...', 'info');
    }

    subscribeToTrips() {
        if (!this.isOnline) return;
        
        tripService.subscribeToAvailableTrips((payload) => {
            const newTrip = payload.new;
            this.availableTrips.push(newTrip);
            showToast('New trip request!', 'info');
            this.init();
        });
    }

    attachEventListeners() {
        // Additional event listeners if needed
    }
}

export default DriverDashboardPage;