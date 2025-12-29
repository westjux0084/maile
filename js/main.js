// Main Application Entry Point
import { supabase } from './config/supabaseConfig.js';
import authService from './services/authService.js';
import router from './router.js';
import { showToast } from './utils/uiHelper.js';

// Make services globally available for onclick handlers
window.authService = authService;
window.supabase = supabase;
window.router = router;

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚗 RideShare Web Application Starting...');
    
    // Check authentication status
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        console.log('✓ User authenticated:', user.email);
        // Get user profile to determine role
        const profileResult = await authService.getUserById(user.id);
        if (profileResult.success && profileResult.data) {
            const role = profileResult.data.role;
            console.log('✓ User role:', role);
            
            // Navigate to appropriate page based on role
            if (role === 'driver') {
                router.navigate('/driver/dashboard');
            } else {
                router.navigate('/customer');
            }
        } else {
            router.navigate('/customer');
        }
    } else {
        console.log('✓ No user authenticated, showing login');
        router.navigate('/');
    }
    
    // Listen to auth state changes
    authService.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
            showToast('Welcome back!', 'success');
        } else if (event === 'SIGNED_OUT') {
            showToast('You have been logged out', 'info');
            router.navigate('/');
        }
    });
    
    // Add global error handling
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showToast('An error occurred. Please try again.', 'error');
    });
    
    // Add service worker for PWA support (optional)
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('✓ Service worker registered');
        } catch (error) {
            console.log('Service worker registration failed:', error);
        }
    }
    
    console.log('✓ Application initialized successfully');
});

// Export for module usage
export { supabase, authService, router };