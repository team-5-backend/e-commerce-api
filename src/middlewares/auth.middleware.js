import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message:
                    'Access token is required and must be in Bearer format',
            });
        }

        const accessToken = authHeader.split(' ')[1];

        if (!accessToken) {
            return res.status(401).json({
                message: 'Access token is required',
            });
        }

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN);

        req.user = decoded.userinfo;
        req.accessToken = accessToken;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Access token expired',
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Invalid access token',
            });
        }

        console.error('AUTH ERROR:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
};

export default auth;
