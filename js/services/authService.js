import { supabase } from '../config/supabaseConfig.js';

class AuthService {
    // Phone authentication
    async signInWithPhone(phone) {
        try {
            const { data, error } = await supabase.auth.signInWithOtp({
                phone: phone
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Phone auth error:', error);
            return { success: false, error: error.message };
        }
    }

    // Verify OTP
    async verifyOTP(phone, token, type = 'sms') {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone,
                token,
                type
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('OTP verification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) throw error;
            return { success: true, user };
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, error: error.message };
        }
    }

    // Create user profile
    async createUserProfile(userId, userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([
                    {
                        id: userId,
                        phone: userData.phone,
                        role: userData.role,
                        full_name: userData.fullName || '',
                        status: 'active'
                    }
                ])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Create profile error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update user profile
    async updateUserProfile(userId, updates) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user by ID
    async getUserById(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update online status
    async updateOnlineStatus(userId, isOnline) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ 
                    is_online: isOnline,
                    last_seen: new Date().toISOString()
                })
                .eq('id', userId);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Update status error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get nearby drivers
    async getNearbyDrivers(lat, lng, radius = 10) {
        try {
            // This would use PostGIS in a real implementation
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'driver')
                .eq('is_online', true)
                .eq('status', 'active');
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get nearby drivers error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign out
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            // Update offline status
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await this.updateOnlineStatus(user.id, false);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // Listen to auth state changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
}

export default new AuthService();