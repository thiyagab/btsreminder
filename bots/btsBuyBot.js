// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TeamsActivityHandler, CardFactory,TurnContext,MessageFactory} = require('botbuilder');

class BTsBuyBot extends TeamsActivityHandler {

    

    handleTeamsMessagingExtensionSubmitAction(context, action) {
        switch (action.commandId) {
        case 'RemindMe':
            return this.remindMe(context, action);
        default:
            throw new Error('NotImplemented');
        }
    }

   async  handleTeamsCardActionInvoke(context) {
         console.log(context.activity)
         await this.deleteActivity(context,context.activity.replyToId);
         return { status: 200 };
    }

    constructor(adapter,conversationReferences) {
        super();

        // Dependency injected dictionary for storing ConversationReference objects used in NotifyController to proactively message users
        this.conversationReferences = conversationReferences;
        this.adapter=adapter;
        this.scheduleActivityReferences=[]

        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const welcomeMessage = 'Welcome to my bot, the bot is designed to do many things, but as of now it works as a reminder, its still in alpha development stage. So contact BT for more info.';
                    await context.sendActivity(welcomeMessage);
                }
            }
            console.log('My Son aadhav is brilliant')
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMessage(async (context, next) => {
            const conversationReference=this.addConversationReference(context.activity);
            const message = context.activity.text;
            // Yes the code is shitty and its intentional
            if(message.toLowerCase().startsWith("remind")){
                const startIndex=6;
                const endIndex=message.lastIndexOf('in ');
                if(endIndex>0){
                    const reminderText=message.substring(startIndex,endIndex);
                    const interval=message.substring(endIndex+3,message.length).trim()
                    let intervalinHr=1;
                    intervalinHr=parseFloat(interval.split(' ')[0]);
                    console.log(intervalinHr);
                    if(interval.indexOf('m')>0){
                        intervalinHr=intervalinHr/60;
                    }
                    const textToRemind="<b>Reminder:</b><br>"+reminderText;
                    this.sendMessage(conversationReference,textToRemind,reminderText,intervalinHr)
                }else{
                    await context.sendActivity('Invalid format. Should end with:  in \'x\' mins|hrs|minutes|hours');
                }
                
            }
            
            
            await next();
        });
    }

    addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity); 
        this.conversationReferences[conversationReference.user.id] = conversationReference;
        return conversationReference;
    }

    remindMe(context, action) {
        // The user has chosen to share a message by choosing the 'Share Message' context menu command.
        let userName = 'unknown';
        if (action.messagePayload.from &&
                action.messagePayload.from.user &&
                action.messagePayload.from.user.displayName) {
            userName = action.messagePayload.from.user.displayName;
        }
        let remindat= action.data.remindat;
        let textToRemind= action.messagePayload.body.content;
        let conversationReference= this.conversationReferences[context.activity.from.id];
        textToRemind ="<b>Reminder:</b><br>"+ textToRemind+"<a href=\""+action.messagePayload.linkToMessage+"\"><i>Orignal Message</i></a>"
        let reminderText= action.messagePayload.body.content;
        
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


    async deleteActivity (context,activityid){
        let timeoutid=this.scheduleActivityReferences[activityid];
        console.log("before clear TimeoutID: "+timeoutid+" activityid: "+activityid);
        clearTimeout(this.scheduleActivityReferences[activityid]);
        delete this.scheduleActivityReferences[activityid];
        await context.deleteActivity(activityid);
        
    }

    scheduleMessage(conversationReference,text,timeout,activityid){
        const timeoutid=setTimeout(() => {
            this.adapter.continueConversation(conversationReference, async turnContext => {
                //Update activity is not sending notification, and also seeing multiple messages is annoying, so delting the redundant scheduled message
                const newActivity=MessageFactory.text(text);
                await turnContext.deleteActivity(activityid);
                await turnContext.sendActivity(newActivity);
            });
        }, timeout*3600*1000);
        console.log("TimeoutID: "+timeoutid+" activityid: "+activityid);
        this.scheduleActivityReferences[activityid]=timeoutid;
    }

    sendMessage(conversationReference,textToRemind,reminderText,remindat){
        let timeout=0.1;
        if(remindat){
           timeout= parseFloat(remindat);
        }
        this.adapter.continueConversation(conversationReference, async turnContext => {
            const activity=await turnContext.sendActivity({
                attachments: [
                    this.createCard(reminderText,'123444')
                ]
            });
            this.scheduleMessage(conversationReference,textToRemind,timeout,activity.id);
        });
    }

    createCard(reminderText,activityid){
        return CardFactory.heroCard(
            "Reminder scheduled",
            reminderText,
            null,
            CardFactory.actions([
                {
                    type: 'invoke',
                    title: 'Delete Reminder',
                    value: {'activityid':activityid}
                }
            ])
        );
    }
    

    
}

module.exports.BTsBuyBot = BTsBuyBot;
