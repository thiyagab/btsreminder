const { DB} = require('./data/DB');
const path = require('path');
const dotenv = require('dotenv');
const date = require('date.js');
let datestring='2020-06-26T11:32:54.7706462+05:30'
let givenstring='9:21pm';

let isPM = givenstring.toLowerCase().indexOf('pm')>0
givenstring=givenstring.toLowerCase().replace(/pm|am/,'').trim()
if(givenstring.indexOf(':')<0){
    givenstring=givenstring+":00"
}

let splittedtimes=givenstring.split(':')
console.log(isPM)
if(isPM){
    console.log(splittedtimes[0])
    splittedtimes[0]=parseInt(splittedtimes[0])+12
}
    givenstring=(splittedtimes[0].length==1?'0':'')+splittedtimes[0]+':'+splittedtimes[1]

datestring=datestring.replace(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/,givenstring)
// datestring = datestring.substring(0,tindex)+givenstring+datestring.substring()

let scheduledate = new Date(datestring)
console.log(scheduledate)


