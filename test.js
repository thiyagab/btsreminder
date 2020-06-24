const { DB} = require('./data/DB');
const path = require('path');
const dotenv = require('dotenv');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });
console.log(process.env.MONGO_URL);

let originalText='Aadhav.T is a pro in everything in 1 hour and at 30 minutes'
// let originalText='Remind Aadhav in 10 minutes'

let lastIndex=originalText.lastIndexOf('in ')
if(lastIndex<originalText.lastIndexOf('at ')){
     lastIndex=originalText.lastIndexOf('at ')
}
parsedValues=[]
console.log(lastIndex)
if(lastIndex>0){
    parsedValues[0]=originalText.substring(0,lastIndex)
    // parsedValues[1]=keyword
    parsedValues[1]=originalText.substring(lastIndex,originalText.length)
}
console.log(parsedValues);

// let db = new DB()


// console.log(new Date().valueOf())
// console.log(new Date().valueOf())
// console.log(process.hrtime()[1])
// console.log(process.hrtime()[1])
// db.scheduleSomething()
// const myobj={"_id":"a","name":"aadhav"}
// //    db.collection("users").insertOne(myobj)
// db.insertOrUpdateUser(myobj);


