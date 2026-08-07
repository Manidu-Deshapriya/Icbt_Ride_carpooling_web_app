const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files from the root directory so the existing folder structure works
app.use(express.static(path.join(__dirname)));

// Default route redirects to the driver dashboard
app.get('/', (req, res) => {
    res.redirect('/driver dashboard/driver_dashboard.html');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Access the driver dashboard at http://localhost:${PORT}/driver%20dashboard/driver_dashboard.html`);
});
