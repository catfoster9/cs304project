function showLoginModal() {
    document.getElementById("authModal").style.display = "block";
}

function closeLoginModal() {
    document.getElementById("authModal").style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
    // Intercept form submissions requiring login
    document.querySelectorAll("form.require-login").forEach(form => {
        form.addEventListener("submit", (e) => {
            if (window.loggedIn !== "true") {
                e.preventDefault();
                showLoginModal();
            }
        });
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeLoginModal);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById("authModal");
        if (event.target === modal) {
            closeLoginModal();
        }
    });
});
