const Validator = (() => {
                const patterns = {
                    required: val => val?.toString().trim() !== '',
                    name: val => /^[a-zA-Z\s\-']{2,100}$/.test(val),
                    mobile: val => /^(\+91)?[6-9]\d{9}$/.test(val),
                    email: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
                    numeric: val => /^\d+$/.test(val),
                    decimal: val => /^\d+(\.\d+)?$/.test(val),
                    alphanum: val => /^[a-zA-Z0-9]+$/.test(val),
                    postal: val => /^\d{6}$/.test(val),
                    dob: val => /^\d{2}-\d{2}-\d{4}$/.test(val),
                };

                const customValidations = {};

                const registerCustomRule = (name, fn) => {
                    customValidations[name] = fn;
                };

                const getRuleFn = rule => patterns[rule] || customValidations[rule];

                const validateField = ($input, rules = []) => {
                    const val = $input.val();
                    const valid = rules.every(rule => {
                        const ruleFn = getRuleFn(rule);
                        return typeof ruleFn === 'function' ? ruleFn(val) : true;
                    });

                    $input.toggleClass('is-invalid', !valid);
                    return valid;
                };

                const validateForm = ($form, schema) =>
                    Object.entries(schema).every(([field, rules]) =>
                        validateField($form.find(`[name="${field}"]`), rules)
                    );

                return { validateField, validateForm, registerCustomRule };
            })();


//How to use 
const schema = {
    fullname: ['required', 'name'],
    email: ['required', 'email'],
    phone: ['mobile'],
    age: ['numeric'],
    birthdate: ['dob'],
  password: ['required', 'strongPassword']
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
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/.test(val)
);

//Validate indivisual field
$('[name="email"]').on('blur', function () {
    Validator.validateField($(this), ['required', 'email']);
});

