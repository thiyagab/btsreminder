const { DB} = require('./data/DB');
const path = require('path');
const dotenv = require('dotenv');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });
console.log(process.env.MONGO_URL);


class Sample{
    constructor(){
        const db = new DB();
        db.initializeMongo();
    }
}
const s = new Sample();
// db.initializeMongo()
// console.log(new Date().valueOf())
// console.log(new Date().valueOf())
// console.log(process.hrtime()[1])
// console.log(process.hrtime()[1])
// db.scheduleSomething()
// const myobj={"_id":"a","name":"aadhav"}
// //    db.collection("users").insertOne(myobj)
// db.insertOrUpdateUser(myobj);


