const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const DIST_PATH = path.join(__dirname, '../dist');

// Serve static assets from build
app.use(express.static(DIST_PATH));

// Routing for Single Page Application
app.get('*', (req, res) => {
  const indexHtmlPath = path.join(DIST_PATH, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LMS Admin Panel Setup</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gray-900 text-white flex items-center justify-center h-screen">
          <div style="max-width: 500px; background: #1f2937; padding: 2rem; border-radius: 0.5rem; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #818cf8; font-size: 1.875rem; font-weight: 800; margin-bottom: 1rem;">LMS Admin Panel</h1>
            <p style="color: #d1d5db; margin-bottom: 1.5rem; line-height: 1.625;">The React frontend needs to be compiled. Run <code>pnpm run build</code> inside the <code>admin-web/</code> folder to compile the assets.</p>
            <div style="display: inline-block; padding: 0.5rem 1rem; background: #4f46e5; border-radius: 0.25rem; font-weight: 600; font-size: 0.875rem;">Ready for compilation</div>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Admin Web running on port ${PORT}`);
});
