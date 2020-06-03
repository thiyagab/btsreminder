const str  = 'thiYYaga';
const scheduleActivityReferences=new Map();
scheduleActivityReferences['dsgds']='dd'
scheduleActivityReferences[2]='cd'
scheduleActivityReferences[3]='dddd'
console.log(scheduleActivityReferences.delete('dsgds'));
let id=setTimeout(() => {
  console.log(scheduleActivityReferences['dsgds'])
}, 3000);
let json= {value:{id,msgid:2}}
console.log(json.value.msgid);


