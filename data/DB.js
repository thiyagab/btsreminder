const Agenda = require('Agenda')
const mongodb = require('mongodb');


class DB {
    constructor(adapter){
        this.adapter=adapter
        // this.initializeAgenda();
        this.initializeMongo(); 
    }

    async initializeAgenda(){
        this.agenda = new Agenda({db: {address: process.env.MONGO_URL}});
        
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
       const client = await mongodb.MongoClient.connect(process.env.MONGO_URL, {useNewUrlParser: true,useUnifiedTopology: true});
       this.db=client.db("btsreminder");
       console.log('Mongo initialized.')
    }

    async insertOrUpdateUser(user){
        await this.db.collection("users").updateOne({"_id":user._id}, { $set:user},{upsert:true})
    }

    async getUser(userid){
        return await this.db.collection("users").findOne({"_id":userid});
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