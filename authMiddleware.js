// authMiddleware.js
const verifyToken = (req, res, next) => {
    // Your token verification logic here
    next();
};

const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
};

module.exports = { verifyToken, verifyAdmin };
