import AuthPage from './pages/authPage.js';
import CustomerHomePage from './pages/customerHomePage.js';
import DriverDashboardPage from './pages/driverDashboardPage.js';
import TrackingPage from './pages/trackingPage.js';
import authService from './services/authService.js';
import { showLoading, hideLoading } from './utils/uiHelper.js';

class Router {
    constructor() {
        this.routes = {
            '/': AuthPage,
            '/auth': AuthPage,
            '/customer': CustomerHomePage,
            '/driver/dashboard': DriverDashboardPage,
            '/driver/register': DriverDashboardPage,
            '/tracking/:id': TrackingPage
        };
        
        this.currentPage = null;
        this.init();
    }

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    async handleRoute() {
        const path = window.location.pathname;
        const route = this.matchRoute(path);
        
        // Cleanup current page
        if (this.currentPage && this.currentPage.cleanup) {
            this.currentPage.cleanup();
        }
        
        // Check authentication for protected routes
        if (this.isProtectedRoute(path)) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                this.navigate('/');
                return;
            }
        }
        
        // Load new page
        showLoading();
        
        try {
            const PageClass = this.routes[route.match];
            if (PageClass) {
                this.currentPage = new PageClass(route.params.id);
                await this.currentPage.init();
            } else {
                this.navigate('/');
            }
        } catch (error) {
            console.error('Route error:', error);
            this.navigate('/');
        }
        
        hideLoading();
    }

    matchRoute(path) {
        // Exact match
        if (this.routes[path]) {
            return { match: path, params: {} };
        }
        
        // Parameterized routes
        for (const route in this.routes) {
            const routeParts = route.split('/');
            const pathParts = path.split('/');
            
            if (routeParts.length !== pathParts.length) {
                continue;
            }
            
            const params = {};
            let match = true;
            
            for (let i = 0; i < routeParts.length; i++) {
                if (routeParts[i].startsWith(':')) {
                    const paramName = routeParts[i].substring(1);
                    params[paramName] = pathParts[i];
                } else if (routeParts[i] !== pathParts[i]) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                return { match: route, params };
            }
        }
        
        return { match: '/', params: {} };
    }

    isProtectedRoute(path) {
        const protectedRoutes = ['/customer', '/driver'];
        return protectedRoutes.some(route => path.startsWith(route));
    }
}

export default new Router();