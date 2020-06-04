const { TeamsActivityHandler, CardFactory,TurnContext,MessageFactory} = require('botbuilder');

let ab=0.16;
let str = ab<1?Math.ceil(ab*60)+" minutes":ab+" hours";
console.log(str)


