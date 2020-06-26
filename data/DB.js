const Agenda = require('agenda')
const mongodb = require('mongodb');
const { TurnContext,MessageFactory} = require('botbuilder');


class DB {
    constructor(adapter){
        this.adapter=adapter
        this.initializeAgenda();
        this.initializeMongo(); 
    }

    async initializeAgenda(){
        this.agenda = new Agenda({db: {address: process.env.MONGO_URL,useUnifiedTopology: true}});
          
        this.agenda.define('scheduleText', async job => {
            let user = await this.getUser(job.attrs.data.userid)
            console.log("Executing schedule "+job.attrs.data.msgid)
            if(user && user.conversationreference){
                this.adapter.continueConversation(user.conversationreference, async turnContext => {
                    //UpdateActivity is not sending notification, and also seeing multiple messages is annoying, so delting the redundant scheduled message    
                    if (job.attrs.data.activityid){
                        await turnContext.deleteActivity(job.attrs.data.activityid);
                    }
                    await turnContext.sendActivity(MessageFactory.text(job.attrs.data.text));
                });
            }else{
                console.log("Job with info and user : "+job.attrs.data.userid+" not found")
            }
            await job.remove()
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


    async scheduleMessage(data,scheduletime){
        await this.agenda.schedule(scheduletime, 'scheduleText',data);
    }

    async removeJob(msgid){
         const jobs = await this.agenda.jobs({'name':'scheduleText','data.msgid':msgid});
         if(jobs && jobs.length>0){
            await jobs[0].remove()
         }
        
    }
}
module.exports.DB = DB;