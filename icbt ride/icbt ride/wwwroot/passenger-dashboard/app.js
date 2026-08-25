// passenger-dashboard/app.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Sidebar/Navigation
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .bottom-nav-links a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (path.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });

    // Default to Home if root
    if (path.endsWith('passenger-dashboard/') || path.endsWith('passenger-dashboard')) {
        document.querySelectorAll('a[href="passenger_dashboard.html"]').forEach(l => l.classList.add('active'));
    }
});
