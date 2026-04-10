const signupWizard = document.getElementById("signupWizard");
const signupForm = document.getElementById("signupPasswordForm");
const progressFill = document.getElementById("signupProgressFill");
const stepLabel = document.getElementById("signupStepLabel");

if (signupWizard) {
    const stepTitles = {
        1: "Verify Email",
        2: "Verification OTP",
        3: "Your Profile",
        4: "Age Verification",
        5: "Security Setup",
        6: "Final Agreement",
    };

    const emailVerified = signupWizard.dataset.emailVerified === "true";
    const allSteps = Array.from(signupWizard.querySelectorAll(".signup-step"));
    const initialStep = Number(signupWizard.dataset.currentStep || (emailVerified ? 3 : 1));
    let currentStep = initialStep;

    function updateWizard(stepNumber) {
        currentStep = stepNumber;
        allSteps.forEach((step) => {
            const stepNum = Number(step.dataset.step);
            step.classList.toggle("active", stepNum === stepNumber);
            
            // Add animation classes
            if (stepNum === stepNumber) {
                step.style.animation = "slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards";
            }
        });

        if (progressFill) {
            progressFill.style.width = `${(stepNumber / 6) * 100}%`;
        }

        if (stepLabel) {
            stepLabel.textContent = `Step ${stepNumber} of 6: ${stepTitles[stepNumber]}`;
        }
    }

    function validateStep(stepNumber) {
        if (!signupForm) return true;

        if (stepNumber === 3) {
            const name = signupForm.querySelector('input[name="name"]');
            if (name.value.trim().length < 2) {
                name.setCustomValidity("Please enter your full name.");
                return name.reportValidity();
            }
            name.setCustomValidity("");
            return true;
        }

        if (stepNumber === 4) {
            const ageInput = signupForm.querySelector('input[name="age"]');
            const ageValue = Number(ageInput.value);
            if (!ageInput.reportValidity()) return false;
            if (ageValue < 18) {
                alert("Accessrestricted to users 18 and older.");
                return false;
            }
            return true;
        }

        if (stepNumber === 5) {
            const password = signupForm.querySelector('input[name="password"]');
            const confirmPassword = signupForm.querySelector('input[name="confirm_password"]');

            if (password.value.length < 8) {
                password.setCustomValidity("Security requirement: 8+ characters.");
                return password.reportValidity();
            }
            password.setCustomValidity("");

            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity("Passwords must match.");
                return confirmPassword.reportValidity();
            }
            confirmPassword.setCustomValidity("");
        }

        return true;
    }

    // Step navigation
    signupWizard.querySelectorAll(".step-next").forEach((button) => {
        button.addEventListener("click", () => {
            if (validateStep(currentStep)) {
                updateWizard(Math.min(currentStep + 1, 6));
            }
        });
    });

    signupWizard.querySelectorAll(".step-back").forEach((button) => {
        button.addEventListener("click", () => {
            updateWizard(Math.max(currentStep - 1, 1));
        });
    });

    if (signupForm) {
        signupForm.addEventListener("submit", (event) => {
            if (!validateStep(5)) {
                event.preventDefault();
                return;
            }
            const termsBox = signupForm.querySelector('input[name="accept_terms"]');
            if (!termsBox.checked) {
                alert("Please agree to the terms to continue.");
                event.preventDefault();
            }
        });
    }

    // Initialize
    updateWizard(initialStep);
}
