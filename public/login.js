document.addEventListener("DOMContentLoaded", () => {

const loginForm = document.querySelector("form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Demo accounts for prototype
const demoUsers = [
    {
        email: "inspector@gmail.com",
        password: "inspector123",
        name: "Arpan Maiti",
        role: "Inspector"
    },
    {
        email: "admin@gmail.com",
        password: "admin123",
        name: "System Admin",
        role: "Admin"
    }
];

// If already logged in, go directly to dashboard
const loggedInUser = localStorage.getItem("lmCurrentUser");

if (loggedInUser) {
    window.location.href = "dashbord.html";
    return;
}

loginForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Find matching demo user
    const user = demoUsers.find(
        account =>
            account.email === email &&
            account.password === password
    );

    if (!user) {
        alert("Invalid email or password.");
        return;
    }

    // Save logged-in user
    localStorage.setItem(
        "lmCurrentUser",
        JSON.stringify({
            name: user.name,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        })
    );

    // Remember login if checkbox is selected
    const rememberCheckbox = document.querySelector(
        '.remember input[type="checkbox"]'
    );

    if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem("lmRememberMe", "true");
    } else {
        localStorage.removeItem("lmRememberMe");
    }

    // Go to dashboard
    window.location.href = "dashbord.html";
});

});
