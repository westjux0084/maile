import tripService from '../services/tripService.js';
import authService from '../services/authService.js';
import { showToast } from '../utils/uiHelper.js';

class CustomerHomePage {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.destinationMarker = null;
        this.selectedRideType = 'standard';
        this.destination = null;
        this.currentLocation = null;
        this.rideTypes = [
            {
                id: 'standard',
                name: 'Standard',
                icon: '🚗',
                basePrice: 5,
                perKm: 1.5,
                details: 'Affordable everyday rides'
            },
            {
                id: 'premium',
                name: 'Premium',
                icon: '🚙',
                basePrice: 10,
                perKm: 2.5,
                details: 'Luxury vehicles'
            },
            {
                id: 'suv',
                name: 'SUV',
                icon: '🚐',
                basePrice: 15,
                perKm: 3,
                details: 'Extra space for groups'
            }
        ];
        this.savedLocations = [
            { name: 'Home', icon: '🏠', address: '123 Main St' },
            { name: 'Work', icon: '🏢', address: '456 Business Ave' },
            { name: 'Airport', icon: '✈️', address: 'International Airport' }
        ];
        this.recentDestinations = [
            { name: 'Shopping Mall', address: '789 Commerce Blvd' },
            { name: 'Restaurant', address: '321 Food Street' }
        ];
    }

    async init() {
        const app = document.getElementById('app');
        app.innerHTML = this.render();
        
        await this.initializeMap();
        await this.getCurrentLocation();
        this.attachEventListeners();
    }

    render() {
        return `
            <div class="page">
                <header class="header">
                    <div class="container header-content">
                        <a href="/" class="logo">🚗 RideShare</a>
                        <nav>
                            <ul class="nav-menu">
                                <li><a href="#" class="nav-link">Home</a></li>
                                <li><a href="#" class="nav-link">Trips</a></li>
                                <li><a href="#" class="nav-link">Profile</a></li>
                                <li><a href="#" class="nav-link" onclick="authService.signOut()">Logout</a></li>
                            </ul>
                        </nav>
                    </div>
                </header>
                
                <div class="container page-content">
                    <div class="customer-home">
                        <div class="map-section">
                            <div id="customer-map"></div>
                        </div>
                        
                        <div class="booking-panel">
                            ${this.renderBookingHeader()}
                            ${this.renderDestinationSection()}
                            ${this.renderSavedLocations()}
                            ${this.renderRideTypeSelector()}
                            ${this.renderDriverAvailability()}
                            ${this.renderCostDisplay()}
                            ${this.renderBookingActions()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBookingHeader() {
        return `
            <div class="booking-header">
                <div class="user-avatar">JD</div>
                <div class="user-info">
                    <h3>John Doe</h3>
                    <p>Customer</p>
                </div>
            </div>
        `;
    }

    renderDestinationSection() {
        return `
            <div class="destination-section">
                <h4 class="section-title">Where to?</h4>
                <div class="destination-input">
                    <span class="location-icon">📍</span>
                    <input 
                        type="text" 
                        class="form-input" 
                        id="destinationInput"
                        placeholder="Enter destination"
                    >
                </div>
            </div>
        `;
    }

    renderSavedLocations() {
        return `
            <div class="saved-locations">
                ${this.savedLocations.map(loc => `
                    <div class="saved-location-item" onclick="window.customerPage.selectDestination('${loc.address}')">
                        <div class="saved-location-icon">${loc.icon}</div>
                        <div class="saved-location-name">${loc.name}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRideTypeSelector() {
        return `
            <div class="ride-type-selector">
                <h4 class="section-title">Choose ride type</h4>
                ${this.rideTypes.map(ride => `
                    <div class="ride-type-card ${this.selectedRideType === ride.id ? 'selected' : ''}" 
                         data-type="${ride.id}" 
                         onclick="window.customerPage.selectRideType('${ride.id}')">
                        <div class="ride-type-icon">${ride.icon}</div>
                        <div class="ride-type-info">
                            <div class="ride-type-name">${ride.name}</div>
                            <div class="ride-type-details">${ride.details}</div>
                        </div>
                        <div class="ride-type-price">$${ride.basePrice}+</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDriverAvailability() {
        return `
            <div class="driver-availability">
                <div class="driver-count">12</div>
                <div class="driver-label">Drivers nearby</div>
                <div class="eta-info">⏱️ Pickup in 3-5 min</div>
            </div>
        `;
    }

    renderCostDisplay() {
        const estimatedCost = this.calculateCost();
        return `
            <div class="cost-display">
                <div class="cost-row">
                    <span class="cost-label">Base fare</span>
                    <span class="cost-value">$${this.rideTypes.find(r => r.id === this.selectedRideType).basePrice}</span>
                </div>
                <div class="cost-row">
                    <span class="cost-label">Distance</span>
                    <span class="cost-value">~5 km</span>
                </div>
                <div class="cost-row">
                    <span class="cost-label">Estimated total</span>
                    <span class="cost-value total-cost">$${estimatedCost}</span>
                </div>
            </div>
        `;
    }

    renderBookingActions() {
        return `
            <div class="booking-actions">
                <button class="btn btn-primary btn-large" style="width: 100%" onclick="window.customerPage.bookRide()">
                    Request Ride
                </button>
            </div>
        `;
    }

    async initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('customer-map').setView([40.7128, -74.0060], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    async getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Update map view
                    this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15);
                    
                    // Add user marker
                    if (this.userMarker) {
                        this.map.removeLayer(this.userMarker);
                    }
                    
                    this.userMarker = L.marker([this.currentLocation.lat, this.currentLocation.lng], {
                        icon: L.divIcon({
                            className: 'user-marker',
                            html: '📍',
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

    selectDestination(address) {
        this.destination = address;
        document.getElementById('destinationInput').value = address;
        
        // Simulate destination marker
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
        }
        
        // Add destination marker (random location for demo)
        const destLat = this.currentLocation.lat + 0.01;
        const destLng = this.currentLocation.lng + 0.01;
        
        this.destinationMarker = L.marker([destLat, destLng], {
            icon: L.divIcon({
                className: 'destination-marker',
                html: '🎯',
                iconSize: [30, 30]
            })
        }).addTo(this.map);
        
        // Fit bounds
        this.map.fitBounds([
            [this.currentLocation.lat, this.currentLocation.lng],
            [destLat, destLng]
        ], { padding: [50, 50] });
    }

    selectRideType(type) {
        this.selectedRideType = type;
        this.init();
    }

    calculateCost() {
        const rideType = this.rideTypes.find(r => r.id === this.selectedRideType);
        const distance = 5; // Assume 5km for demo
        return (rideType.basePrice + (distance * rideType.perKm)).toFixed(2);
    }

    async bookRide() {
        const destination = document.getElementById('destinationInput').value;
        
        if (!destination) {
            showToast('Please enter a destination', 'error');
            return;
        }
        
        if (!this.currentLocation) {
            showToast('Getting your location...', 'warning');
            return;
        }
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showToast('Please login first', 'error');
            return;
        }
        
        // Create trip
        const rideType = this.rideTypes.find(r => r.id === this.selectedRideType);
        const tripData = {
            customerId: user.id,
            pickupLocation: 'Current Location',
            pickupLat: this.currentLocation.lat,
            pickupLng: this.currentLocation.lng,
            dropoffLocation: destination,
            dropoffLat: this.currentLocation.lat + 0.01,
            dropoffLng: this.currentLocation.lng + 0.01,
            rideType: this.selectedRideType,
            estimatedCost: parseFloat(this.calculateCost()),
            estimatedDuration: 15,
            distance: 5
        };
        
        const result = await tripService.createTrip(tripData);
        
        if (result.success) {
            showToast('Ride requested successfully!', 'success');
            // Navigate to tracking page
            setTimeout(() => {
                window.router.navigate(`/tracking/${result.data.id}`);
            }, 1000);
        } else {
            showToast(result.error, 'error');
        }
    }

    attachEventListeners() {
        const destinationInput = document.getElementById('destinationInput');
        if (destinationInput) {
            destinationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.selectDestination(destinationInput.value);
                }
            });
        }
    }
}

export default CustomerHomePage;