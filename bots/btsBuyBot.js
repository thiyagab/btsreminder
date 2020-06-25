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
            await this.addConversationReference(context.activity);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            this.processMembersAdded(context);
            await next();
        });

        this.onMessage(async (context, next) => {
            this.processIncomingMessage(context);
            await next();
        });
    }


    async processMembersAdded(context){
        const membersAdded = context.activity.membersAdded;
        for (let cnt = 0; cnt < membersAdded.length; cnt++) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                const welcomeMessage = "Welcome to BTs Reminder bot, the bot is useful both in private chat and you can also select 'remind me this' option from action menu in  messages in public channel and group chats and its still in alpha development stage. So contact BT for more info.";
                await context.sendActivity(welcomeMessage);
            }
        }
        console.log('My Son aadhav is brilliant')
    }

    async processIncomingMessage(context){
        const message = context.activity.text;
        let localTimestamp=context.activity.localTimestamp
        const conversationReference= await this.addConversationReference(context.activity);
        
        // Yes the code is shitty and its intentional
        if(message.toLowerCase().startsWith("remind")){
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
        const user={"_id":activity.from.id,"conversationreference":conversationReference}
        await this.db.insertOrUpdateUser(user);
        return conversationReference;
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
        if (conversationReference){
            this.sendMessage(conversationReference,textToRemind,reminderText,remindat,context.activity.localTimestamp);
            
        }else{
            const heroCard = CardFactory.heroCard(`I dont know you`,
            'As a Bot i am not supposed to message you, until you message me first. Send me a message and introduce yourself first, before asking me to remind you. (since there is no visible only to you option as in slack, i am using this compose box, please clear after reading)');
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
      //Lets see when the first bug comes, i believe this simple check covers 99% of usecase
      if(timerText.indexOf('at ')>0 || timerText.indexOf(':')){
          console.log(scheduletime)
          console.log(localTimestamp)
          console.log(localTimestamp.getTimezoneOffset())
          scheduletime=new Date(scheduletime.valueOf()+(60*1000*localTimestamp.getTimezoneOffset()))
          console.log(scheduletime)
      }
      this.db.scheduleMessage({userid:userid,text:textToRemind,activityid:activityid,msgid:msgid},scheduletime)

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
