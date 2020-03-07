const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

router.post('/signup', passport.authenticate('signup', {session: false}), async (req,res,next) => {
    res.json({
        message: req.message,
        user: req.user
    })
} );

router.post('/signin', async (req, res, next) => {
    // console.log('--req---',req);
    passport.authenticate("signin", async (err, user, info) => {
      try {
        if (err || !user) {
          return res.status(401).json({
            ...info
          });
        }

        req.login(user, { session: false }, async error => {
          const body = { _id: user._id, email: user.email };
          const token = jwt.sign({ user: body }, "tekmentors");
          return res.json({ token });
        });
      } catch (e) {
        return next(e);
      }
    })(req, res, next); 
})

module.exports =router;
