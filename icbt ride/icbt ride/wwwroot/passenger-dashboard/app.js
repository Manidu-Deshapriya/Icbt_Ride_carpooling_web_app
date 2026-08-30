// passenger-dashboard/app.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Sidebar/Navigation
    const path = window.location.pathname.split('/').pop() || 'passenger_dashboard.html';
    const navLinks = document.querySelectorAll('.nav-links a, .bottom-nav-links a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (path === href || (path === '' && href === 'passenger_dashboard.html'))) {
            link.classList.add('active');
        }
    });
});
