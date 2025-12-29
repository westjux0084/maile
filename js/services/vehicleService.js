import { supabase } from '../config/supabaseConfig.js';

class VehicleService {
    // Register vehicle
    async registerVehicle(vehicleData) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .insert([{
                    driver_id: vehicleData.driverId,
                    make: vehicleData.make,
                    model: vehicleData.model,
                    year: vehicleData.year,
                    color: vehicleData.color,
                    license_plate: vehicleData.licensePlate,
                    vehicle_type: vehicleData.vehicleType,
                    seating_capacity: vehicleData.seatingCapacity,
                    photos: vehicleData.photos || [],
                    documents: vehicleData.documents || {},
                    status: 'pending'
                }])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Register vehicle error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update vehicle
    async updateVehicle(vehicleId, updates) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .update(updates)
                .eq('id', vehicleId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update vehicle error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get vehicle by ID
    async getVehicleById(vehicleId) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get vehicle error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get driver's vehicles
    async getDriverVehicles(driverId) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('driver_id', driverId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get driver vehicles error:', error);
            return { success: false, error: error.message };
        }
    }

    // Upload vehicle photo
    async uploadVehiclePhoto(driverId, photoFile, photoType) {
        try {
            const fileName = `${driverId}/${photoType}_${Date.now()}_${photoFile.name}`;
            const filePath = `vehicle-photos/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vehicle-photos')
                .upload(filePath, photoFile);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('vehicle-photos')
                .getPublicUrl(filePath);

            return { success: true, url: urlData.publicUrl };
        } catch (error) {
            console.error('Upload photo error:', error);
            return { success: false, error: error.message };
        }
    }

    // Verify vehicle
    async verifyVehicle(vehicleId, verifiedBy, notes) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .update({
                    status: 'verified',
                    verified_by: verifiedBy,
                    verified_at: new Date().toISOString(),
                    verification_notes: notes
                })
                .eq('id', vehicleId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Verify vehicle error:', error);
            return { success: false, error: error.message };
        }
    }

    // Reject vehicle
    async rejectVehicle(vehicleId, reason) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .update({
                    status: 'rejected',
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString()
                })
                .eq('id', vehicleId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Reject vehicle error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get pending vehicles (for admin)
    async getPendingVehicles() {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select(`
                    *,
                    driver:driver_id(id, full_name, phone, email)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get pending vehicles error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get vehicle statistics
    async getVehicleStatistics(driverId) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('driver_id', driverId);
            
            if (error) throw error;

            const stats = {
                totalVehicles: data.length,
                verifiedVehicles: data.filter(v => v.status === 'verified').length,
                pendingVehicles: data.filter(v => v.status === 'pending').length,
                rejectedVehicles: data.filter(v => v.status === 'rejected').length
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Get vehicle statistics error:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new VehicleService();