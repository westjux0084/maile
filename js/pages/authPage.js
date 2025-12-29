import authService from '../services/authService.js';
import { showToast } from '../utils/uiHelper.js';

class AuthPage {
    constructor() {
        this.currentStep = 'phone';
        this.phoneNumber = '';
        this.selectedRole = 'customer';
        this.otp = '';
    }

    render() {
        return `
            <div class="auth-container">
                <div class="auth-card fade-in">
                    <div class="auth-header">
                        <div class="auth-logo">🚗</div>
                        <h2>RideShare</h2>
                        <p class="auth-subtitle">Your Journey, Our Priority</p>
                    </div>
                    
                    ${this.renderCurrentStep()}
                    
                    <div class="auth-footer">
                        <p>By continuing, you agree to our <a href="#" class="auth-link">Terms of Service</a> and <a href="#" class="auth-link">Privacy Policy</a></p>
                    </div>
                </div>
            </div>
        `;
    }

    renderCurrentStep() {
        switch(this.currentStep) {
            case 'phone':
                return this.renderPhoneStep();
            case 'role':
                return this.renderRoleStep();
            case 'otp':
                return this.renderOTPStep();
            default:
                return this.renderPhoneStep();
        }
    }

    renderPhoneStep() {
        return `
            <form class="auth-form" id="phoneForm">
                <div class="form-group">
                    <label class="form-label">Phone Number</label>
                    <div class="phone-input-group">
                        <select class="form-select country-code" id="countryCode">
                            <option value="+1">+1 (US)</option>
                            <option value="+44">+44 (UK)</option>
                            <option value="+91">+91 (India)</option>
                            <option value="+86">+86 (China)</option>
                            <option value="+61">+61 (Australia)</option>
                        </select>
                        <input 
                            type="tel" 
                            class="form-input" 
                            id="phoneNumber" 
                            placeholder="Enter phone number"
                            required
                        >
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-large">
                    Continue
                </button>
            </form>
        `;
    }

    renderRoleStep() {
        return `
            <div class="role-selection">
                <div class="role-card ${this.selectedRole === 'customer' ? 'selected' : ''}" 
                     data-role="customer" onclick="window.authPage.selectRole('customer')">
                    <div class="role-icon">👤</div>
                    <h3 class="role-title">Customer</h3>
                    <p class="role-description">Book rides and travel</p>
                </div>
                
                <div class="role-card ${this.selectedRole === 'driver' ? 'selected' : ''}" 
                     data-role="driver" onclick="window.authPage.selectRole('driver')">
                    <div class="role-icon">🚗</div>
                    <h3 class="role-title">Driver</h3>
                    <p class="role-description">Earn money driving</p>
                </div>
            </div>
            
            <div class="mt-3">
                <button class="btn btn-primary btn-large" style="width: 100%" onclick="window.authPage.proceedToOTP()">
                    Continue as ${this.selectedRole}
                </button>
            </div>
            
            <div class="mt-2 text-center">
                <a href="#" class="auth-link" onclick="window.authPage.goBackToPhone()">Change phone number</a>
            </div>
        `;
    }

    renderOTPStep() {
        return `
            <div class="text-center">
                <h3>Enter OTP</h3>
                <p class="text-light">We've sent a code to ${this.phoneNumber}</p>
                
                <div class="otp-input-container" id="otpContainer">
                    ${[1,2,3,4,5,6].map(i => `
                        <input 
                            type="text" 
                            class="otp-input" 
                            maxlength="1" 
                            data-index="${i}"
                            oninput="window.authPage.handleOTPInput(this)"
                            onkeydown="window.authPage.handleOTPKeyDown(event, this)"
                        >
                    `).join('')}
                </div>
                
                <div class="timer" id="otpTimer">
                    Resend code in <span id="timerValue">60</span>s
                </div>
                
                <button class="btn btn-primary btn-large" onclick="window.authPage.verifyOTP()">
                    Verify & Continue
                </button>
                
                <div class="mt-2">
                    <a href="#" class="auth-link resend-link" id="resendLink" onclick="window.authPage.resendOTP()">
                        Resend OTP
                    </a>
                </div>
            </div>
        `;
    }

    init() {
        const app = document.getElementById('app');
        app.innerHTML = this.render();
        this.attachEventListeners();
    }

    attachEventListeners() {
        const phoneForm = document.getElementById('phoneForm');
        if (phoneForm) {
            phoneForm.addEventListener('submit', (e) => this.handlePhoneSubmit(e));
        }
    }

    async handlePhoneSubmit(e) {
        e.preventDefault();
        
        const countryCode = document.getElementById('countryCode').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        
        if (!phoneNumber || phoneNumber.length < 10) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }
        
        this.phoneNumber = `${countryCode}${phoneNumber}`;
        
        // Send OTP
        const result = await authService.signInWithPhone(this.phoneNumber);
        
        if (result.success) {
            showToast('OTP sent successfully!', 'success');
            this.currentStep = 'role';
            this.init();
        } else {
            showToast(result.error, 'error');
        }
    }

    selectRole(role) {
        this.selectedRole = role;
        this.init();
    }

    proceedToOTP() {
        this.currentStep = 'otp';
        this.init();
        this.startOTPTimer();
    }

    goBackToPhone() {
        this.currentStep = 'phone';
        this.init();
    }

    handleOTPInput(input) {
        const index = parseInt(input.dataset.index);
        const value = input.value;
        
        if (value && index < 6) {
            const nextInput = document.querySelector(`input[data-index="${index + 1}"]`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    }

    handleOTPKeyDown(event, input) {
        const index = parseInt(input.dataset.index);
        
        if (event.key === 'Backspace' && !input.value && index > 1) {
            const prevInput = document.querySelector(`input[data-index="${index - 1}"]`);
            if (prevInput) {
                prevInput.focus();
            }
        }
    }

    async verifyOTP() {
        const otpInputs = document.querySelectorAll('.otp-input');
        let otp = '';
        
        otpInputs.forEach(input => {
            otp += input.value;
        });
        
        if (otp.length !== 6) {
            showToast('Please enter complete OTP', 'error');
            return;
        }
        
        const result = await authService.verifyOTP(this.phoneNumber, otp);
        
        if (result.success) {
            // Create user profile
            const userId = result.data.user.id;
            await authService.createUserProfile(userId, {
                phone: this.phoneNumber,
                role: this.selectedRole
            });
            
            showToast('Login successful!', 'success');
            
            // Redirect based on role
            setTimeout(() => {
                if (this.selectedRole === 'customer') {
                    window.router.navigate('/customer');
                } else {
                    window.router.navigate('/driver/register');
                }
            }, 1000);
        } else {
            showToast(result.error, 'error');
        }
    }

    async resendOTP() {
        const result = await authService.signInWithPhone(this.phoneNumber);
        
        if (result.success) {
            showToast('OTP resent successfully!', 'success');
            this.startOTPTimer();
        } else {
            showToast(result.error, 'error');
        }
    }

    startOTPTimer() {
        let seconds = 60;
        const timerValue = document.getElementById('timerValue');
        const resendLink = document.getElementById('resendLink');
        
        resendLink.disabled = true;
        
        const timer = setInterval(() => {
            seconds--;
            timerValue.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(timer);
                resendLink.disabled = false;
                document.getElementById('otpTimer').innerHTML = `
                    <a href="#" class="auth-link resend-link" onclick="window.authPage.resendOTP()">Resend OTP</a>
                `;
            }
        }, 1000);
    }
}

export default AuthPage;