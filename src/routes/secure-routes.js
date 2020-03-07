const express = require('express');
const router = express.Router();

router.get('/admin', (req, res, next) => {
    res.json({
        message: 'You can access admin api as you are authenticated',
        user: req.user,
        token: req.query.secret_token
    })
})

module.exports = router;