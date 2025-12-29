import { supabase } from '../config/supabaseConfig.js';

class TripService {
    // Create a new trip
    async createTrip(tripData) {
        try {
            const { data, error } = await supabase
                .from('trips')
                .insert([{
                    customer_id: tripData.customerId,
                    pickup_location: tripData.pickupLocation,
                    pickup_lat: tripData.pickupLat,
                    pickup_lng: tripData.pickupLng,
                    dropoff_location: tripData.dropoffLocation,
                    dropoff_lat: tripData.dropoffLat,
                    dropoff_lng: tripData.dropoffLng,
                    ride_type: tripData.rideType,
                    estimated_cost: tripData.estimatedCost,
                    estimated_duration: tripData.estimatedDuration,
                    distance: tripData.distance,
                    status: 'requested',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Create trip error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update trip status
    async updateTripStatus(tripId, status) {
        try {
            const updates = { 
                status,
                updated_at: new Date().toISOString()
            };

            // Add timestamp based on status
            if (status === 'accepted') {
                updates.accepted_at = new Date().toISOString();
            } else if (status === 'enRoute') {
                updates.en_route_at = new Date().toISOString();
            } else if (status === 'arrived') {
                updates.arrived_at = new Date().toISOString();
            } else if (status === 'inProgress') {
                updates.started_at = new Date().toISOString();
            } else if (status === 'completed') {
                updates.completed_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('trips')
                .update(updates)
                .eq('id', tripId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update trip error:', error);
            return { success: false, error: error.message };
        }
    }

    // Accept trip (driver)
    async acceptTrip(tripId, driverId) {
        try {
            const { data, error } = await supabase
                .from('trips')
                .update({
                    driver_id: driverId,
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tripId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Accept trip error:', error);
            return { success: false, error: error.message };
        }
    }

    // Cancel trip
    async cancelTrip(tripId, reason) {
        try {
            const { data, error } = await supabase
                .from('trips')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason,
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tripId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Cancel trip error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get customer's trips
    async getCustomerTrips(customerId, status = null) {
        try {
            let query = supabase
                .from('trips')
                .select(`
                    *,
                    driver:driver_id(id, full_name, phone, rating, vehicle_info)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get customer trips error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get driver's trips
    async getDriverTrips(driverId, status = null) {
        try {
            let query = supabase
                .from('trips')
                .select(`
                    *,
                    customer:customer_id(id, full_name, phone, rating)
                `)
                .eq('driver_id', driverId)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get driver trips error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get available trips for drivers
    async getAvailableTrips(lat, lng, radius = 10) {
        try {
            // In real implementation, use PostGIS for geospatial queries
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('status', 'requested')
                .order('created_at', { ascending: true })
                .limit(20);
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get available trips error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get trip by ID
    async getTripById(tripId) {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select(`
                    *,
                    customer:customer_id(id, full_name, phone, rating),
                    driver:driver_id(id, full_name, phone, rating, vehicle_info)
                `)
                .eq('id', tripId)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get trip error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get trip statistics
    async getTripStatistics(userId, role, period = 'week') {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq(role === 'driver' ? 'driver_id' : 'customer_id', userId)
                .eq('status', 'completed');
            
            if (error) throw error;
            
            // Calculate statistics
            const stats = {
                totalTrips: data.length,
                totalRevenue: role === 'driver' ? data.reduce((sum, trip) => sum + (trip.actual_cost || 0), 0) : 0,
                totalDistance: data.reduce((sum, trip) => sum + (trip.distance || 0), 0),
                averageRating: 0
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Get statistics error:', error);
            return { success: false, error: error.message };
        }
    }

    // Subscribe to trip updates (real-time)
    subscribeToTrip(tripId, callback) {
        return supabase
            .channel(`trip:${tripId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'trips',
                filter: `id=eq.${tripId}`
            }, callback)
            .subscribe();
    }

    // Subscribe to available trips (for drivers)
    subscribeToAvailableTrips(callback) {
        return supabase
            .channel('available-trips')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'trips',
                filter: 'status=eq.requested'
            }, callback)
            .subscribe();
    }
}

export default new TripService();