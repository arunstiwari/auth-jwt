// Create a passport middleware to support signup
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;

const jwtStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;

const User = require('../models/user');

//passport middleware to handle my registration
passport.use('signup', new localStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try{
        //save the user to database
        const finalUser = new User({
            email,
            password
        });

        const result = await finalUser.save();
        console.log('---result ---',result);
        return done(null, result, {message: 'User Signed up successfully'})

    }catch(error ){
        console.log('--Error while saving ---',error);
        done(error, false);
    }
}))

//new middleware to support signin
passport.use('signin', new localStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        console.log('---in signin middleware of passport---', email)
        //verify if email id exists or not
        const foundUser = await User.findOne({email});
        console.log('---foundUser---',foundUser);
        if (!foundUser) {
            return done(null, false, {message: 'User Not found'});
        }
        //validation of password
        const isMatch = await foundUser.isValidPassword(password);
        if (!isMatch) {
            return done(null, false, { message: "Invalid Password" });
        }
        return done(null, foundUser, { message: "User Logged in successfully" });
    } catch (e) {
        return done(e, false, {message: 'Error occured'})
    }
}))

// jwt verification middleware
passport.use(
  "jwt",
  new jwtStrategy({
    secretOrKey: "tekmentors",
    jwtFromRequest: ExtractJWT.fromUrlQueryParameter('secret_token')
  }, async(token, done) => {
      try {
      return done(null, token.user);
      } catch (e) {
      return done(e, false);
      }
      
  })
);