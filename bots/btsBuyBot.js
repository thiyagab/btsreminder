// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TeamsActivityHandler, CardFactory,TurnContext,MessageFactory} = require('botbuilder');
const datejs = require('date.js');

// The accessor names for the conversation data and user profile state property accessors.
const CONVERSATION_DATA_PROPERTY = 'conversationData';
const USER_PROFILE_PROPERTY = 'userProfile';

class BTsBuyBot extends TeamsActivityHandler {

      /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);
    }
    

    handleTeamsMessagingExtensionSubmitAction(context, action) {
        switch (action.commandId) {
        case 'RemindMe':
            return this.remindMe(context, action);
        default:
            throw new Error('NotImplemented');
        }
    }

   async  handleTeamsCardActionInvoke(context) {
         await this.deleteActivity(context,context.activity.replyToId,context.activity.value.msgid);
         return { status: 200 };
    }

    constructor(adapter,db) {
        super();
        this.adapter=adapter;
        this.db=db 
        this.onConversationUpdate(async (context, next) => {
            // await this.addConversationReference(context.activity);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            this.processMembersAdded(context);
            await next();
        });

        this.onMessage(async (context, next) => {
            await this.processIncomingMessage(context);
            await next();
        });
    }


    async processMembersAdded(context){
        const membersAdded = context.activity.membersAdded;
        for (let cnt = 0; cnt < membersAdded.length; cnt++) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                const welcomeMessage = "Welcome to BTs Reminder bot.<br>You can set the reminder by chatting 1:1 with me<br>Samples are:<br>"
                "'remind to update timesheet at 5:00pm'<br>'remind to finish this task in 1 hour 15 minutes'<br><br>You can also use this reminder in public channel and group chats by selecting 'remind me this' from action menu.<br><br>Its still in beta development stage. So contact BT for more info.";
                await context.sendActivity(welcomeMessage);
            }
        }
        console.log('My Son aadhav is brilliant')
    }

    async processIncomingMessage(context){
        const message = context.activity.text;
        let localTimestamp=context.activity.rawLocalTimestamp
        const conversationReference= await this.addConversationReference(context.activity);
        if(!conversationReference){
            await context.sendActivity('Not supported in channel or group. Chat with me 1:1, move mouse over the bot image and choose to chat');
        }else if(message.toLowerCase().startsWith("remind")){
            const startIndex=6;
            let parsedValues=this.parseTextWithSchedule(message)
            if(parsedValues.length>0){
                let reminderText=parsedValues[0].substring(startIndex).trim();
                const timerText=parsedValues[1].trim()
                const textToRemind="<b>Reminder:</b><br>"+reminderText;
                this.sendMessage(conversationReference,textToRemind,reminderText,timerText,localTimestamp)
            }else{
                await context.sendActivity('Invalid format. Should end with:  in \'x\' mins|hrs|minutes|hours');
            }
            
        }
    }

    async addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity); 
        if(conversationReference.conversation && 'personal'==conversationReference.conversation.conversationType){
            const user={"_id":activity.from.id,"conversationreference":conversationReference}
            await this.db.insertOrUpdateUser(user);
            return conversationReference;
        }
    }

   async getConversationReference(context){
        const user= await this.db.getUser(context.activity.from.id)
        if(user){
            return user.conversationreference
        }
    }

    async remindMe(context, action) {
        // The user has chosen to share a message by choosing the 'Share Message' context menu command.
        let userName = 'unknown';
        if (action.messagePayload.from &&
                action.messagePayload.from.user &&
                action.messagePayload.from.user.displayName) {
            userName = action.messagePayload.from.user.displayName;
        }
        let remindat= action.data.remindat;
        let textToRemind= action.messagePayload.body.content;
        let conversationReference= await this.getConversationReference(context);

        textToRemind ="<b>Reminder:</b><br>"+ textToRemind+"<a href=\""+action.messagePayload.linkToMessage+"\"><i>Orignal Message</i></a>"
        let reminderText= action.messagePayload.body.content;
        if(remindat)
        console.log("Scheduling action message in "+remindat);
        console.log(context.activity)
        if (conversationReference){
            this.sendMessage(conversationReference,textToRemind,reminderText,remindat,context.activity.rawLocalTimestamp);
            
        }else{
            const heroCard = CardFactory.heroCard(`I dont know you`,
            'As a Bot i am not supposed to message you, until you message me first. Send me a message ( just a hi) and introduce yourself first. (since there is no visible only to you option as in slack, i am using this compose box, please clear after reading)');
            const attachment = { contentType: heroCard.contentType, content: heroCard.content, preview: heroCard };
            return {
                composeExtension: {
                    type: 'result',
                    attachmentLayout: 'list',
                    attachments: [
                        attachment
                    ]
                }
            };
        } 
    }


    async deleteActivity (context,activityid,msgid){
        await this.db.removeJob(msgid)
        await context.deleteActivity(activityid);
    }

       
    sendMessage(conversationReference,textToRemind,reminderText,timerText,localTimestamp){
        reminderText=reminderText+"<br> <i> "+timerText+"</i>";
        //If this code works for multiple users and multiple reminders, its a miracle
        //and ofcourse this wont work between restarts 
        const msgid=this.getUniqueMessageId();
        this.adapter.continueConversation(conversationReference, async turnContext => {
            const activity=await turnContext.sendActivity({
                attachments: [
                    this.createCard(reminderText,msgid)
                ]
            });
            this.scheduleMessageWithDB(conversationReference.user.id,activity.id,msgid,textToRemind,timerText,localTimestamp)
        });
        
        console.log("Scheduling with msgid "+msgid);
    }


    

    scheduleMessageWithDB(userid,activityid,msgid,textToRemind,timerText,localTimestamp){
      let scheduletime = new datejs(timerText)
      console.log('Schedule message with db: '+scheduletime)
      //Lets see when the first bug comes, i believe this simple check covers 99% of usecase
      if(timerText.indexOf('at ')>=0 || timerText.indexOf(':')>0){        
          timerText=timerText.replace('at','').trim()
          scheduletime=this.getScheduleWithTimezoneOffset(timerText,localTimestamp)
      }
      this.db.scheduleMessage({userid:userid,text:textToRemind,activityid:activityid,msgid:msgid},scheduletime)

    }

    getScheduleWithTimezoneOffset(timerText,localTimestamp){
        //Enakku vera vazhi therlaye..  if there is a better solution than this, welcome
        //When user says remind me at 11am, the 11 should be in his/her timezone, so we need to have a reference
        //Microsoft the way it is, cant even give a proper way to tell user's timezone, but luckily we have rawLocalTimestamp string from activity 
        //We are trying to just kick the hours part out, and squeeze our timestamp in
        console.log(timerText+" "+localTimestamp)
        let isPM = timerText.toLowerCase().indexOf('pm')>0
        timerText=timerText.toLowerCase().replace(/pm|am/,'').trim()
        if(timerText.indexOf(':')<0){
            timerText=timerText+":00"
        }

        let splittedtimes=timerText.split(':')
        if(isPM){
            splittedtimes[0]=parseInt(splittedtimes[0])+12
        }
        timerText=(splittedtimes[0].length==1?'0':'')+splittedtimes[0]+':'+splittedtimes[1]
        localTimestamp=localTimestamp.replace(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/,timerText)
        let scheduledate = new Date(localTimestamp)
        console.log(scheduledate)
        return scheduledate
    }

    parseTextWithSchedule(originalText){
        let lastIndex=originalText.lastIndexOf('in ')
        if(lastIndex<originalText.lastIndexOf('at ')){
             lastIndex=originalText.lastIndexOf('at ')
        }
        let parsedValues=[]
        if(lastIndex>0){
            parsedValues[0]=originalText.substring(0,lastIndex)
            parsedValues[1]=originalText.substring(lastIndex,originalText.length)
        }
        return parsedValues
    }

    //In future our implementation will be db based, so we will store the msg, activity states in db
    getUniqueMessageId(){
        return new Date().valueOf();
    }

    createCard(reminderText,msgid){
        let card= CardFactory.heroCard(
            "Reminder scheduled",
            reminderText,
            null,
            CardFactory.actions([
                {
                    type: 'invoke',
                    title: 'Delete Reminder',
                    value: {msgid:msgid}
                }
            ])
        );
        //TODO do this after figuring out user's timezone
        // let date = new Date();
        // card.content.subtitle="scheduled at: "+date.getHours()+":"+date.getMinutes();
        return card;
    }



    

    
}

module.exports.BTsBuyBot = BTsBuyBot;
