// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TeamsActivityHandler, CardFactory,TurnContext,MessageFactory} = require('botbuilder');

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
         console.log(context.activity.value.timeoutid);
         await this.deleteActivity(context,context.activity.replyToId,context.activity.value.msgid);
         return { status: 200 };
    }

    constructor(adapter,db) {
        super();
        this.adapter=adapter;
        this.msgActivityReferences=[]
        this.msgTimeoutReferences=[]
        this.db=db 
        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
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
                const welcomeMessage = "Welcome to bts Reminder bot, the bot is useful both in private chat and you can also select 'remind me this' option from action menu in  messages in public channel and group chats and its still in alpha development stage. So contact BT for more info.";
                await context.sendActivity(welcomeMessage);
            }
        }
        console.log('My Son aadhav is brilliant')
    }

    async processIncomingMessage(context){
        const conversationReference=this.addConversationReference(context.activity);
        const message = context.activity.text;
        // Yes the code is shitty and its intentional
        if(message.toLowerCase().startsWith("remind")){
            const startIndex=6;
            const endIndex=message.lastIndexOf('in ');
            if(endIndex>0){
                let reminderText=message.substring(startIndex,endIndex).trim();
                const interval=message.substring(endIndex+3,message.length).trim()
                let intervalinHr=1;
                intervalinHr=parseFloat(interval.split(' ')[0]);
                
                if(interval.indexOf('m')>0){
                    intervalinHr=intervalinHr/60;
                }
                console.log("Scheduling message in "+intervalinHr);
                const textToRemind="<b>Reminder:</b><br>"+reminderText;
                this.sendMessage(conversationReference,textToRemind,reminderText,intervalinHr)
            }else{
                await context.sendActivity('Invalid format. Should end with:  in \'x\' mins|hrs|minutes|hours');
            }
            
        }
    }

    addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity); 
        const user={"_id":activity.from.id,"conversationreference":conversationReference}
        this.db.insertOrUpdateUser(user);
        return conversationReference;
    }

   async getConversationReference(context){
        //TODO THIS IS BROKEN.  this will return someone else's conversation reference too
        // We need to persist the conversation reference per userid in DB
        // return this.userProfileAccessor.conversationReference;
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
            this.sendMessage(conversationReference,textToRemind,reminderText,remindat);
            
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
        if(this.msgTimeoutReferences[msgid]){
            clearTimeout(this.msgTimeoutReferences[msgid]);
        }
        delete this.msgTimeoutReferences[msgid]
        delete this.msgActivityReferences[msgid];
        await context.deleteActivity(activityid);
    }

    scheduleMessage(conversationReference,text,timeout,msgid){
        const timeoutid=setTimeout(() => {
            this.adapter.continueConversation(conversationReference, async turnContext => {
                //UpdateActivity is not sending notification, and also seeing multiple messages is annoying, so delting the redundant scheduled message    
                if (this.msgActivityReferences[msgid]){
                    await turnContext.deleteActivity(this.msgActivityReferences[msgid]);
                    delete this.msgActivityReferences[msgid];
                }
                await turnContext.sendActivity(MessageFactory.text(text));
            });
        }, timeout*3600*1000);
        return timeoutid;
    }
    
    sendMessage(conversationReference,textToRemind,reminderText,remindat){
        let timeout=0.1;
        if(remindat){
           timeout= parseFloat(remindat);
        }
        reminderText=reminderText+"<br> <i> in "+(timeout<1? Math.ceil(timeout*60)+" minute(s)":timeout+" hour(s)")+"</i>";
        //If this code works for multiple users and multiple reminders, its a miracle
        //and ofcourse this wont work between restarts 
        const msgid=this.getUniqueMessageId();
        this.adapter.continueConversation(conversationReference, async turnContext => {
            const activity=await turnContext.sendActivity({
                attachments: [
                    this.createCard(reminderText,msgid)
                ]
            });
            this.msgActivityReferences[msgid]=activity.id;
        });
        let timeoutid=this.scheduleMessage(conversationReference,textToRemind,timeout,msgid);
        this.msgTimeoutReferences[msgid]=timeoutid;
        console.log("Scheduling with msgid "+msgid+" total schedules: "+this.msgActivityReferences.length);
    }


    scheduleMessageWithDB(){

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
