const signupWizard = document.getElementById("signupWizard");
const signupForm = document.getElementById("signupPasswordForm");
const progressFill = document.getElementById("signupProgressFill");
const stepLabel = document.getElementById("signupStepLabel");

if (signupWizard) {
    const stepTitles = {
        1: "Email Verification",
        2: "Identity Authentication",
        3: "Profile Creation",
        4: "Age Verification",
        5: "Security Setup",
        6: "Access Agreement",
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
        });

        if (progressFill) {
            progressFill.style.width = `${(stepNumber / 6) * 100}%`;
        }

        const stepNumDisplay = document.getElementById("currentStepNum");
        if (stepNumDisplay) {
            stepNumDisplay.textContent = stepNumber;
        }

        if (stepLabel) {
            stepLabel.textContent = stepTitles[stepNumber];
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
