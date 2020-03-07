const express = require('express');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true}, () => {
    console.log('mongodb is connected');
})

const PORT = process.argv[2] || 4000;
console.log('----PORT---',PORT);
console.log("----PORT---", process.argv);

const passport = require('passport');
require('./auth/auth');

const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());

const routes = require('./routes/user');
const securedRoues = require('./routes/secure-routes');

app.use('/', routes);
app.use('/users', passport.authenticate('jwt', {session: false}) ,securedRoues);

//Handle errors
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({error: err}); 
})


app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});