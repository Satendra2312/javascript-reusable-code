const Validator = (() => {
    const patterns = {
        required: {
            validate: val => val?.toString().trim() !== "",
            message: "This field is required."
        },
        name: {
            validate: val => /^[a-zA-Z\s\-']{2,100}$/.test(val),
            message: "Only letters, 2–100 characters."
        },
        mobile: {
            validate: val => /^(\+91)?[6-9]\d{9}$/.test(val),
            message: "Enter valid Indian mobile number."
        },
        email: {
            validate: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
            message: "Enter valid email address."
        },
        numeric: {
            validate: val => /^\d+$/.test(val),
            message: "Only numeric digits allowed."
        },
        decimal: {
            validate: val => /^\d+(\.\d+)?$/.test(val),
            message: "Enter valid decimal number."
        },
        alphanum: {
            validate: val => /^[a-zA-Z0-9]+$/.test(val),
            message: "Use letters or digits only."
        },
        postal: {
            validate: val => /^\d{6}$/.test(val),
            message: "Postal code must be 6 digits."
        },
        dob: {
            validate: val => /^\d{2}-\d{2}-\d{4}$/.test(val),
            message: "Use DD-MM-YYYY format."
        }
    };

    const customValidations = {};

    const registerCustomRule = (name, fn, msg = "Invalid input") => {
        customValidations[name] = { validate: fn, message: msg };
    };

    const getRuleObj = rule => patterns[rule] || customValidations[rule];

    const validateField = ($input, ruleObjs = []) => {
        const val = $input.val();
        let msg = "";

        const valid = ruleObjs.every(({ rule, message }) => {
            const ruleObj = getRuleObj(rule);
            if (ruleObj?.validate && !ruleObj.validate(val)) {
                msg = message || ruleObj.message || "Invalid input";
                return false;
            }
            return true;
        });

        $input.toggleClass("is-invalid", !valid);
        $input.next(".validation-msg").remove();
        if (!valid && msg) {
            $input.after(`<div class="validation-msg text-danger">${msg}</div>`);
        }

        return valid;
    };

    const validateForm = ($form, schema) =>
        Object.entries(schema).every(([field, ruleObjs]) =>
            validateField($form.find(`[name="${field}"]`), ruleObjs)
        );

    return { validateField, validateForm, registerCustomRule };
})();

//How to use 
const schema = {
    mobileNo: [
        { rule: "required", message: "Mobile number is required." },
        { rule: "mobile", message: "Enter a valid Indian mobile number." }
    ],
    amount: [
        { rule: "required", message: "Please enter an amount." },
        { rule: "decimal", message: "Must be a valid decimal." },
        { rule: "minAmount", message: "Amount must be at least ₹1." }
    ]
};

//form validate
$('#myForm').on('submit', function (e) {
    e.preventDefault(); 

    if (Validator.validateForm($(this), schema)) {
        console.log('Form valid. Submitting...');
    } else {
        console.log('Validation failed.');
    }
});

//custome rule 
Validator.registerCustomRule('strongPassword', val =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/.test(val), "Password is all mixed"
);
Validator.registerCustomRule("minAmount", val => parseFloat(val) >= 1, "Amount must be at least ₹1");

//Validate indivisual field
$('[name="email"]').on('blur', function () {
    Validator.validateField($(this), ['required', 'email']);
});

