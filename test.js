const { TeamsActivityHandler, CardFactory,TurnContext,MessageFactory} = require('botbuilder');
const str  = 'thiYYaga';
const scheduleActivityReferences=new Map();
scheduleActivityReferences['dsgds']='dd'
scheduleActivityReferences[2]='cd'
scheduleActivityReferences[3]='dddd'
console.log(scheduleActivityReferences.delete('dsgds'));
let timeoutid=setTimeout(() => {
  console.log(scheduleActivityReferences['dsgds'])
}, 3000);
let msgid=2
let json= 
[
  {
      type: 'invoke',
      title: 'Delete Reminder',
      value: {timeoutid,msgid:msgid}
  }
];

  let card= CardFactory.heroCard(
      "Reminder scheduled",
      'dsgsdg',
      null,
      CardFactory.actions([
          {
              type: 'invoke',
              title: 'Delete Reminder',
              value: {timeoutid,msgid:msgid}
          }
      ])
  );
let a = new Timeout ()
console.log(timeoutid)
// console.log(card);


