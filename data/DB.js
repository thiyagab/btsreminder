const Agenda = require('Agenda')
const mongodb = require('mongodb');


const MONGO_URL='mongodb+srv://bt:3@btsreminder-wz10c.mongodb.net/btsreminder?authSource=admin&replicaSet=btsreminder-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true';
class DB {
    constructor(adapter){
        this.adapter=adapter
        // this.initializeAgenda();
        

        
    }

    async initializeAgenda(){
        this.agenda = new Agenda({db: {address: MONGO_URL}});
        
        this.agenda.define('printsomething', async job => {
            console.log('Printing something '+job.attrs.data.name);
            job.remove()
          });
        
          this.agenda.define('scheduleText', async job => {
            
            console.log('scheduling something '+job.attrs.data.name);
            job.remove()
          });
        
        await this.agenda.start();  
    }


   async initializeMongo(){
        
       const client = await mongodb.MongoClient.connect(MONGO_URL, {useNewUrlParser: true});
       const db=client.db("btsreminder");
       const myobj={"_id":"ddsdg","name":"thiyaga"}
    //    db.collection("users").insertOne(myobj)
       await db.collection("users").update({"_id":"ddsdg"},{"_id":"ddsdg","name":"jgj"},{upsert:true})
       
        // this.insertOrUpdateUser(myobj)

    }

    insertOrUpdateUser(user){
        this.db.collection("users").insertOne(user)

    }

    async scheduleSomething(){
        
        const jobs=await this.agenda.jobs({name: 'printsomething',data:{"name":"a"}})
        jobs.forEach(job => {
            console.log(job.attrs.data.name)
        });

        // await this.agenda.schedule('20 minutes', 'printsomething',{"name":"a"});
        // await this.agenda.schedule('30 minutes', 'printsomething',{"name":"b"});
        // await this.agenda.every('30 seconds', 'printsomething',{"name":"summa"});
    }

    async scheduleMessage(data,timeout,callback){
        data.msgid
        data.conversationReference
        data.text
        
        const jobs=await this.agenda.jobs({name: 'printsomething',data:{"name":"a"}})
        jobs.forEach(job => {
            console.log(job.attrs.data.name)
        });

        // await this.agenda.schedule('20 minutes', 'printsomething',{"name":"a"});
        // await this.agenda.schedule('30 minutes', 'printsomething',{"name":"b"});
        // await this.agenda.every('30 seconds', 'printsomething',{"name":"summa"});
    }
}
module.exports.DB = DB;