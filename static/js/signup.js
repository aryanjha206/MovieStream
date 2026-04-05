const signupWizard = document.getElementById("signupWizard");
const signupForm = document.getElementById("signupPasswordForm");
const progressFill = document.getElementById("signupProgressFill");
const stepLabel = document.getElementById("signupStepLabel");

if (signupWizard) {
    const stepTitles = {
        1: "Step 1 of 6: Enter your email",
        2: "Step 2 of 6: Verify OTP",
        3: "Step 3 of 6: Enter your name",
        4: "Step 4 of 6: Enter your age",
        5: "Step 5 of 6: Create password",
        6: "Step 6 of 6: Accept terms",
    };

    const emailVerified = signupWizard.dataset.emailVerified === "true";
    const allSteps = Array.from(signupWizard.querySelectorAll(".signup-step"));
    const initialStep = Number(signupWizard.dataset.currentStep || (emailVerified ? 3 : 1));
    let currentStep = initialStep;

    function updateWizard(stepNumber) {
        currentStep = stepNumber;
        allSteps.forEach((step) => {
            step.classList.toggle("active", Number(step.dataset.step) === stepNumber);
        });

        if (progressFill) {
            progressFill.style.width = `${(stepNumber / 6) * 100}%`;
        }

        if (stepLabel) {
            stepLabel.textContent = stepTitles[stepNumber];
        }
    }

    function validateStep(stepNumber) {
        if (!signupForm) {
            return true;
        }

        if (stepNumber === 3) {
            const name = signupForm.querySelector('input[name="name"]');
            return name.reportValidity();
        }

        if (stepNumber === 4) {
            const age = signupForm.querySelector('input[name="age"]');
            const ageValue = Number(age.value);
            if (!age.reportValidity()) {
                return false;
            }
            if (ageValue < 18) {
                window.alert("You must be at least 18 years old to register.");
                return false;
            }
            return true;
        }

        if (stepNumber === 5) {
            const password = signupForm.querySelector('input[name="password"]');
            const confirmPassword = signupForm.querySelector('input[name="confirm_password"]');

            if (!password.reportValidity() || !confirmPassword.reportValidity()) {
                return false;
            }

            if (password.value !== confirmPassword.value) {
                window.alert("Passwords do not match.");
                return false;
            }
        }

        return true;
    }

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
            const age = Number(signupForm.querySelector('input[name="age"]').value);
            const password = signupForm.querySelector('input[name="password"]').value;
            const confirmPassword = signupForm.querySelector('input[name="confirm_password"]').value;

            if (age < 18) {
                event.preventDefault();
                window.alert("You must be at least 18 years old to register.");
                return;
            }

            if (password !== confirmPassword) {
                event.preventDefault();
                window.alert("Passwords do not match.");
            }
        });
    }

    updateWizard(initialStep);
}
