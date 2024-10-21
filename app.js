const http = require('http');  // Step 1: Require the HTTP module

// Step 2: Create a server
const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});  // Step 3: Write response headers
    res.write('Hello, welcome to your Node.js server!');  // Step 4: Write response body
    res.end();  // Step 5: End the response
});

// Step 6: Listen on port 3000
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
});
