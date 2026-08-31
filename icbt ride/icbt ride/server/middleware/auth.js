const { auth, db } = require('../config/firebase');

/**
 * Middleware: Verify Firebase ID Token
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In dev mode, allow optional mock user headers for quick Postman testing
    if (req.headers['x-user-id'] && req.headers['x-user-role']) {
      req.user = {
        uid: req.headers['x-user-id'],
        role: req.headers['x-user-role'],
        email: req.headers['x-user-email'] || 'dev@icbtride.lk'
      };
      return next();
    }
    return res.status(401).json({
      success: false,
      error: 'Access denied. No authentication token provided.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    let decodedToken = null;
    if (auth) {
      decodedToken = await auth.verifyIdToken(token);
    } else {
      decodedToken = { uid: token };
    }

    req.user = decodedToken;

    // Fetch user role from Firestore if available
    if (db && decodedToken.uid) {
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        req.user = { ...req.user, ...userDoc.data() };
      }
    }

    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.',
      code: 'AUTH_TOKEN_INVALID',
      details: error.message
    });
  }
}

/**
 * Middleware: Role-Based Access Control (RBAC)
 * @param {string[]} allowedRoles
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role || 'passenger';
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: `Forbidden. Role '${userRole}' does not have permission for this resource.`,
        code: 'ROLE_FORBIDDEN'
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
