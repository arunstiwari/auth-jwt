

### Step 1 - Create Mongodb Model
```js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})

UserSchema.pre('save', async function(next){
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
});

const User = mongoose.model('user', UserSchema);

module.exports = User;
```

### Step 2 - Create Passport middleware to support signup auth.js
```js
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;

const User = require('../models/users');

//Create a passport middleware to handle user registration
passport.use('signup', new localStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        //save the information provided by the user to the database
        const finalUser = new User({
            email, password
        })
        const user = await finalUser.save({email, password});
        //send the user information to the next middleware
        return done(null, user);
    } catch (e) {
        console.log('---error while saving the user to database during registration---',e);
        done(e);
    }
}));
```

### Step 3 - Create routes to support the signup in routes/routes.js
```js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/signup', passport.authenticate('signup',{session: false}), async (req, res, next) => {
    res.json({
        message: 'Signup Successful',
        user: req.user
    })
});

module.exports = router;
```

### Step 4 - Create a basic app server configuration to support the api with endpoint /signup
```js
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const User = require('./models/users');
require('./auth/auth');

const app = express();
mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true, useUnifiedTopology: true}, () => {
    console.log('---Mongodb connected ---');
})

app.use(express.urlencoded({extended: false}));
app.use(express.json());

const routes = require('./routes/routes');

app.use('/',routes);

//Handle errors
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({ error : err });
});

app.listen(4000, () => {
    console.log('App listening on port 4000!');
});
```

### Step 5 - Start the server 
```
 $ npm run start
```

### Step 6 - Test the signup using postman. Go to url http://localhost:4000/signup and in body add
```json
{
	"email": "moddhan1@gmail.com",
	"password": "password"

}
```
Response will be 
```json
{
    "message": "Signup Successful",
    "user": {
        "_id": "5e5e1fdef7bf9df654fee381",
        "email": "moddhan1@gmail.com",
        "password": "$2a$10$D6ggdFxdqDlnl4/iTMQde.SrmA5.YY4Cg/YiGk3HEsnkmH1b5OVcu",
        "__v": 0
    }
}
```
### Step 7 - Let us implement the signin feature by entering the email and valid password
> Step 7a - Add the follwing methods in the User model which does the validation of entered password models/users.js
```js
        UserSchema.methods.isValidPassword = async function(newPassword){
            const compare = bcrypt.compare(newPassword, this.password);
            return compare;
        }
```
> Step 7b - Add the Passport middleware for signin in the auth/auth.js
```js
//Create a passport middleware to handle User login
passport.use('signin', new localStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    console.log('----passport middleware ----', email, '---',password);
    try {
        //Find the user associated with the given email
        const user = await User.findOne({email});
        console.log('----Found User----',user);
        if (!user) {
            return done(null, false, {message: 'User not found'});
        }

        //validate password
        const isMatch = await user.isValidPassword(password);
        console.log("----Found Match----", isMatch);
        if (!isMatch) {
            return done(null, false, {message: 'Invalid Password'});
        }
        return done(null, user, {message: 'User logged in successfully'});
    } catch (e) {
        return done(e);
    }
}))

```
> Step 7c - Implement the routes to support the signin endpoint
```javascript
// Create a JWT token during the signin process  signin
router.post('/signin',  async (req, res, next) => {
    console.log('---in signin route----',req);
    passport.authenticate('signin',
    async (err, user, info) => {
        console.log('----inside authenticate ----',user);
        try {
            if (err || !user) {
                console.log("----inside if authenticate ----", user, ', info: ',info);
                if(info){
                    console.log('----info is there ----');
                    return res.status(401).json({
                        ...info
                    });
                }
            
                return res.status(401).json({
                    message: 'An error occured'
                });
            }

            req.login(user, {session: false}, async (error) => {
                if (error) {
                    return next(error);
                }

                const body = {_id: user._id, email: user.email};

                //sign the jwt token and populate the payload with the user email and id
                const token = jwt.sign({user: body}, 'top_secret');
                //send back the token to the user
                return res.json({token});
            });
        } catch (e) {
            return next(e);
        }
    }
    )(req, res, next);
})
```
> Step 7d - Test the application by going to the url http://localhost:4000/sigin. Enter the valid userid and password
```json
{
	"email": "moddhan1@gmail.com",
	"password": "password"
}
```
**Response should have jwt token**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6IjVlNWUxZmRlZjdiZjlkZjY1NGZlZTM4MSIsImVtYWlsIjoibW9kZGhhbjFAZ21haWwuY29tIn0sImlhdCI6MTU4MzIyODIzNH0.FUbLsONvd4dMwP8JbcPJgPndkpbWvu5yG43q8s6VBwM"
}
```
### Step 8 - Create a Secure routes which can be accessed only when we have a valid jwt token
> Step 8a - Create a passport middleware to support the jwt verification step in auth/auth.js
```javascript
//Add these two modules
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
...
...

//Now let us provide an implementation to verify the user token
passport.use(new JWTStrategy({
    secretOrKey: 'top_secret',
    jwtFromRequest: ExtractJWT.fromUrlQueryParameter('secret_token')
}, async (token, done) =>{
    try {
        //pass the user details to the next middleware
        return done(null, token.user);
    } catch (e) {
        return done(error);
    }
}))
```
> Step 8b - Create a secured routes in routes/secure-routes.js
```js
const express = require("express");

const router = express.Router();

//Let's say the route below is very sensitive and we want only authorized users to have access

//Displays information tailored according to the logged in user
router.get("/profile", (req, res, next) => {
  //We'll just send back the user details and the token
  res.json({
    message: "You made it to the secure route",
    user: req.user,
    token: req.query.secret_token
  });
});

module.exports = router;

```
> Step 8c - Add the secure routes to app middleware in app.js
```js
const secureRoutes = require('./routes/secure-routes');

app.use('/user', passport.authenticate('jwt', {session: false}), secureRoutes);

```
> Step 8d - Now test the application protected routes by typing the following stuff in browser url tab
http://localhost:4000/user/profile?secret_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6IjVlNWRmN2VjZDlhNDdkZTUyOGU0NjhkNyIsImVtYWlsIjoibW9kZGhhbkBnbWFpbC5jb20ifSwiaWF0IjoxNTgzMjIyMzU2fQ.odmvixnJ9-AxZ4K1mNEnZFvlE3ziwpuaaYgy3TgGrgw

**You should get the response as**
```json
{
    "message": "You made it to the secure route",
    "user": {
        "_id": "5e5df7ecd9a47de528e468d7",
        "email": "moddhan@gmail.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6IjVlNWRmN2VjZDlhNDdkZTUyOGU0NjhkNyIsImVtYWlsIjoibW9kZGhhbkBnbWFpbC5jb20ifSwiaWF0IjoxNTgzMjIyMzU2fQ.odmvixnJ9-AxZ4K1mNEnZFvlE3ziwpuaaYgy3TgGrgw"
}
```
