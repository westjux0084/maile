import tripService from '../services/tripService.js';
import { showToast } from '../utils/uiHelper.js';

class TrackingPage {
    constructor(tripId) {
        this.tripId = tripId;
        this.map = null;
        this.driverMarker = null;
        this.destinationMarker = null;
        this.routeLine = null;
        this.trip = null;
        this.subscription = null;
    }

    async init() {
        const app = document.getElementById('app');
        app.innerHTML = this.render();
        
        await this.loadTrip();
        await this.initializeMap();
        this.subscribeToTripUpdates();
    }

    render() {
        return `
            <div class="page tracking-page">
                <div class="tracking-map-container">
                    <div id="tracking-map"></div>
                    
                    <div class="stats-overlay">
                        <div class="stats-card">
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-icon">📏</div>
                                    <div class="stat-value">${this.trip?.distance || 0} km</div>
                                    <div class="stat-label">Distance</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">⏱️</div>
                                    <div class="stat-value">${this.trip?.estimated_duration || 0} min</div>
                                    <div class="stat-label">Duration</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">🚗</div>
                                    <div class="stat-value">45 km/h</div>
                                    <div class="stat-label">Speed</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">💰</div>
                                    <div class="stat-value">$${this.trip?.estimated_cost || 0}</div>
                                    <div class="stat-label">Fare</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="floating-actions">
                        <button class="fab fab-primary" onclick="window.trackingPage.centerMap()">
                            🎯
                        </button>
                        <button class="fab fab-secondary" onclick="window.trackingPage.callDriver()">
                            📞
                        </button>
                        <button class="fab fab-danger" onclick="window.trackingPage.cancelTrip()">
                            ✖️
                        </button>
                    </div>
                    
                    ${this.renderControlSheet()}
                </div>
            </div>
        `;
    }

    renderControlSheet() {
        if (!this.trip) return '';
        
        return `
            <div class="control-sheet">
                <div class="control-sheet-handle"></div>
                
                ${this.trip.driver ? this.renderDriverInfo() : ''}
                
                <div class="eta-countdown">
                    <div class="eta-time">${this.calculateETA()} min</div>
                    <div class="eta-label">Estimated arrival time</div>
                    <div class="eta-address">${this.trip.dropoff_location}</div>
                </div>
                
                <div class="trip-progress-widget">
                    ${this.renderTripProgress()}
                </div>
                
                <div class="speed-indicator">
                    <div>
                        <div class="speed-value">45</div>
                        <div class="speed-unit">km/h</div>
                    </div>
                    <div class="speed-limit">
                        <div class="speed-limit-value">60</div>
                        <div class="speed-limit-label">Speed Limit</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDriverInfo() {
        return `
            <div class="driver-info-card">
                <div class="driver-header">
                    <div class="driver-photo">${this.trip.driver.full_name.charAt(0)}</div>
                    <div class="driver-details">
                        <h4>${this.trip.driver.full_name}</h4>
                        <div class="driver-rating">⭐ ${this.trip.driver.rating || 4.5}</div>
                    </div>
                </div>
                <div class="vehicle-info">
                    <div class="vehicle-detail">
                        <div class="vehicle-label">Vehicle</div>
                        <div class="vehicle-value">${this.trip.driver.vehicle_info?.make || 'Toyota'} ${this.trip.driver.vehicle_info?.model || 'Camry'}</div>
                    </div>
                    <div class="vehicle-detail">
                        <div class="vehicle-label">Plate</div>
                        <div class="vehicle-value">${this.trip.driver.vehicle_info?.license_plate || 'ABC 123'}</div>
                    </div>
                    <div class="vehicle-detail">
                        <div class="vehicle-label">Color</div>
                        <div class="vehicle-value">${this.trip.driver.vehicle_info?.color || 'White'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTripProgress() {
        const steps = [
            { id: 'requested', title: 'Request sent', completed: true },
            { id: 'accepted', title: 'Driver accepted', completed: this.trip.status !== 'requested' },
            { id: 'enRoute', title: 'Heading to pickup', completed: ['enRoute', 'arrived', 'inProgress', 'completed'].includes(this.trip.status) },
            { id: 'arrived', title: 'Arrived at pickup', completed: ['arrived', 'inProgress', 'completed'].includes(this.trip.status) },
            { id: 'inProgress', title: 'Trip in progress', completed: ['inProgress', 'completed'].includes(this.trip.status) },
            { id: 'completed', title: 'Arrived at destination', completed: this.trip.status === 'completed' }
        ];
        
        return steps.map(step => `
            <div class="progress-step">
                <div class="progress-icon ${step.completed ? 'completed' : 'pending'}">
                    ${step.completed ? '✓' : '○'}
                </div>
                <div class="progress-info">
                    <div class="progress-title">${step.title}</div>
                    <div class="progress-status ${step.completed ? 'completed' : 'pending'}">
                        ${step.completed ? 'Completed' : 'Pending'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadTrip() {
        const result = await tripService.getTripById(this.tripId);
        
        if (result.success) {
            this.trip = result.data;
            this.init();
        } else {
            showToast('Failed to load trip', 'error');
        }
    }

    async initializeMap() {
        if (!this.trip) return;
        
        // Initialize Leaflet map
        this.map = L.map('tracking-map').setView([this.trip.pickup_lat, this.trip.pickup_lng], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Add markers based on trip status
        if (this.trip.status === 'requested' || this.trip.status === 'accepted') {
            // Show pickup location
            L.marker([this.trip.pickup_lat, this.trip.pickup_lng], {
                icon: L.divIcon({
                    className: 'pickup-marker',
                    html: '📍',
                    iconSize: [30, 30]
                })
            }).addTo(this.map).bindPopup('Pickup Location');
        } else {
            // Show driver location (simulated)
            const driverLat = this.trip.pickup_lat + 0.005;
            const driverLng = this.trip.pickup_lng + 0.005;
            
            this.driverMarker = L.marker([driverLat, driverLng], {
                icon: L.divIcon({
                    className: 'driver-marker',
                    html: '🚗',
                    iconSize: [30, 30]
                })
            }).addTo(this.map).bindPopup('Your Driver');
            
            // Show destination
            this.destinationMarker = L.marker([this.trip.dropoff_lat, this.trip.dropoff_lng], {
                icon: L.divIcon({
                    className: 'destination-marker',
                    html: '🎯',
                    iconSize: [30, 30]
                })
            }).addTo(this.map).bindPopup('Destination');
            
            // Draw route
            this.routeLine = L.polyline([
                [driverLat, driverLng],
                [this.trip.dropoff_lat, this.trip.dropoff_lng]
            ], {
                color: '#6C63FF',
                weight: 5,
                opacity: 0.7
            }).addTo(this.map);
            
            // Fit bounds
            this.map.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });
        }
    }

    calculateETA() {
        // Simulate ETA based on trip status
        const etaMap = {
            'requested': 10,
            'accepted': 8,
            'enRoute': 5,
            'arrived': 0,
            'inProgress': 5,
            'completed': 0
        };
        return etaMap[this.trip.status] || 5;
    }

    centerMap() {
        if (this.driverMarker) {
            this.map.setView(this.driverMarker.getLatLng(), 16);
        } else if (this.trip) {
            this.map.setView([this.trip.pickup_lat, this.trip.pickup_lng], 15);
        }
    }

    callDriver() {
        if (this.trip?.driver?.phone) {
            showToast(`Calling ${this.trip.driver.full_name}...`, 'info');
            // In real app, initiate phone call
        } else {
            showToast('Driver phone not available', 'error');
        }
    }

    async cancelTrip() {
        if (confirm('Are you sure you want to cancel this trip?')) {
            const result = await tripService.cancelTrip(this.tripId, 'Customer cancelled');
            
            if (result.success) {
                showToast('Trip cancelled successfully', 'success');
                // Navigate back to home
                setTimeout(() => {
                    window.router.navigate('/customer');
                }, 1500);
            } else {
                showToast(result.error, 'error');
            }
        }
    }

    subscribeToTripUpdates() {
        this.subscription = tripService.subscribeToTrip(this.tripId, (payload) => {
            const updatedTrip = payload.new;
            this.trip = updatedTrip;
            showToast('Trip status updated!', 'info');
            this.init();
        });
    }

    cleanup() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

export default TrackingPage;