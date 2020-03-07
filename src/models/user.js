//1. Create a Mongodb model
// We create a schema => then this schema gets compiled => compiled schema model => 

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    password: {type: String, required: true}
});

UserSchema.pre('save', async function(next){
   const hashedPassword = await bcrypt.hash(this.password, 10);
   this.password = hashedPassword;
   next();
})

UserSchema.methods.isValidPassword = async function(newPassword){
    const match = await bcrypt.compare(newPassword, this.password);
    return match;
}

const User = mongoose.model('users',UserSchema);

module.exports = User;
