const str  = 'thiYYaga';
const scheduleActivityReferences=[]
scheduleActivityReferences['dsgds']='dd'
scheduleActivityReferences[2]='cd'
scheduleActivityReferences[3]='dddd'
delete scheduleActivityReferences[5]
let id=setTimeout(() => {
  console.log("hi")
}, 3000);

console.log(clearTimeout(id));


