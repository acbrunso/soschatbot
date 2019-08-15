/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 'use strict';

 const functions = require('firebase-functions');
 const {google} = require('googleapis');
 const {WebhookClient} = require('dialogflow-fulfillment');
 
 // Enter your calendar ID below and service account JSON below
// const calendarId = "fill in";
 const calendarId = "fill in";
 const serviceAccount = {
  }; // Starts with {"type": "service_account",...
 
 // Set up Google Calendar Service account credentials
 const serviceAccountAuth = new google.auth.JWT({
   email: serviceAccount.client_email,
   key: serviceAccount.private_key,
   scopes: 'https://www.googleapis.com/auth/calendar'
 });
 
 const calendar = google.calendar('v3');
 process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements
 
 const timeZone = 'America/Chicago';
 const timeZoneOffset = '-05:00';
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log("Parameters", agent.parameters);
  const appointment_type = agent.parameters.AppointmentType;
  
  //FUNCTION USED BY THE HOURS INTENT
  function getHours(agent) {
    let givenDate;
    let weekday;
    givenDate = new Date(Date.parse(agent.parameters.date.split('T')[0].toString()));
    weekday = givenDate.toString().substring(0,3);
    if(agent.parameters.hourlocation == "gym") {
        if(weekday==="Mon"||weekday==="Tue"||weekday==="Wed"||weekday==="Thu"||weekday==="Fri"){
          agent.add("The hours of the base gym on "+givenDate.toString().substring(0,16)+"are 0500-2000.");
        }else if(weekday==="Sat"||weekday=="Sun"){
          agent.add("The hours of the base gym on "+givenDate.toString().substring(0,16)+"are 0900-1630.");
        }else{
          agent.add("The hours of the base gym are: Mon-Fri: 0500-2000, Sat-Sun: 0900-1630.");
        }
    } else if(agent.parameters.hourlocation == "gate") {
      	agent.add("The hours of the base gates are as follows.  The main gate is open 24 hours, while the Day Street gate closes inbound traffic at 1400 and outbound traffic at 1800.");
    } else if(agent.parameters.hourlocation == "bx") {
      if(weekday==="Mon"){
          agent.add("The hours of the Base Exchange on "+givenDate.toString().substring(0,16)+"are 0900-1800.");
        }else if(weekday==="Tue"||weekday==="Wed"||weekday==="Thu"||weekday==="Fri"||weekday==="Sat"){
          agent.add("The hours of the Base Exchange on "+givenDate.toString().substring(0,16)+"are 0900-1900.");
        }else if(weekday=="Sun"){
          agent.add("The hours of the Base Exchange on "+givenDate.toString().substring(0,16)+"are 1100-1700.");
        }else{
          agent.add("The hours of the Base Exchange are: Mon: 0900-1800, Tue-Sat: 0900-1900, Sun: 1100-1700.");
        }
    } else if(agent.parameters.hourlocation == "commissary") {
      	if(weekday==="Mon"){
          agent.add("The commissary is closed on Mondays.");
        }else if(weekday==="Tue"||weekday==="Wed"||weekday==="Thu"||weekday==="Fri"||weekday==="Sat"){
          agent.add("The hours of the commissary on "+givenDate.toString().substring(0,16)+"are 0900-1900.");
        }else if(weekday=="Sat"){
          agent.add("The hours of the commissary on "+givenDate.toString().substring(0,16)+"are 0900-1700.");
        }else if(weekday=="Sun"){
          agent.add("The hours of the commissary on "+givenDate.toString().substring(0,16)+"are 1100-1700.");
        }else{
          agent.add("The hours of the commissary are Mon: Closed, Tue-Fri: 0900-1900, Sat: 0900-1700, Sun: 1100-1700.");
        }
    } else if(agent.parameters.hourlocation == "library") {
        if(weekday==="Mon"||weekday==="Tue"||weekday==="Wed"||weekday==="Thu"){
          agent.add("The hours of the AU library on "+givenDate.toString().substring(0,16)+"are 0730-2100.");
        } else if(weekday==="Fri"){
          agent.add("The hours of the AU library on "+givenDate.toString().substring(0,16)+"are 0730-1700.");
        } else if(weekday==="Sat"){
          agent.add("The hours of the AU library on "+givenDate.toString().substring(0,16)+"are 1100-1700.");
        } else if(weekday=="Sun"){
          agent.add("The AU library is closed on Sundays.");
        }else{
          agent.add("The hours of the AU library are Mon-Thu: 0730-2100, Fri: 0730-1700, Sat: 1100-1700, Sun: Closed.");
        }
    } else if(agent.parameters.hourlocation == "Bldg. 1403") {
      	agent.add("The hours of the Bldg. 1403 are generally Mon-Fri: 0600-1800, Sat-Sun: Closed.  However, your flight commander can get you set up to have off-hours building access.");
    }else {
      agent.add("I'm not sure about the hours question you're referring to, but my creators will see this and get me the answer soon!");
   }
 }
    
   // THIS IS THE ADDED CODE TO READ FROM CALENDAR
   function checkSchedule (agent) {
     let dateTimeStart;
     let dateTimeEnd;
     let tempDate;
     if (agent.parameters['date-period'].startDate) {
       dateTimeStart = new Date(agent.parameters['date-period'].startDate);
       dateTimeEnd = new Date(agent.parameters['date-period'].endDate);
     } else if (agent.parameters.date) {
       if (agent.parameters.time) {
         dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0] + timeZoneOffset));
         dateTimeEnd = new Date(new Date(dateTimeStart).setMinutes(dateTimeStart.getMinutes() + 1));
       } else if (agent.parameters['time-period'].startTime) {
         dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters['time-period'].startTime.split('T')[1].split('-')[0] + timeZoneOffset));
         dateTimeEnd = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters['time-period'].endTime.split('T')[1].split('-')[0] + timeZoneOffset));
       } else {
         dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T00:00:00' + timeZoneOffset));
         dateTimeEnd = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T23:59:59' + timeZoneOffset));
       }  
     } else if (agent.parameters.time) {
       tempDate = new Date(Date.now()).toISOString();
       dateTimeStart = new Date(Date.parse(tempDate.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0] + timeZoneOffset));
       dateTimeEnd = new Date(new Date(dateTimeStart).setMinutes(dateTimeStart.getMinutes() + 1));
     } else if (agent.parameters['time-period'].startTime) {
       tempDate = new Date(Date.now()).toISOString();
       dateTimeStart = new Date(Date.parse(tempDate.split('T')[0] + 'T' + agent.parameters['time-period'].startTime.split('T')[1].split('-')[0] + timeZoneOffset));
       dateTimeEnd = new Date(Date.parse(tempDate.split('T')[0] + 'T' + agent.parameters['time-period'].endTime.split('T')[1].split('-')[0] + timeZoneOffset));
     } else {
       agent.add('Which date are you interested in? Try "Tell me the schedule for this week." or "What is on the schedule tomorrow afternoon?"');
     }

     let promise = checkNow(dateTimeStart, dateTimeEnd, agent);
     return promise.then(
       result => agent.add(result), 
       error => agent.add('There was an error processing the request, please try again.')
     );
   }
   // END CODE TO READ FROM CALENDAR
function checkDue(agent) {
   
   //agent.add("test");
   
   //const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0]         + 'T' + agent.parameters.time.split('T')[1].split('-')[0] + timeZoneOffset));
   const dateTimeStart =   new Date(Date.parse(agent.parameters['date-time'].split('T')[0] + 'T' + agent.parameters['date-time'].split('T')[1].split('-')[0] + timeZoneOffset));
   const dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 1));
   const appointmentTimeString = dateTimeStart.toLocaleString(
     'en-US',
     { month: 'long', day: 'numeric', hour: 'numeric', timeZone: timeZone }
   );
	
   let promise = checkDueSub(dateTimeStart, dateTimeEnd, appointment_type, agent);
   
   return promise.then(function () {
     	agent.add("."); //console.log("Promise Resolved");
	}).catch(function () {
     	agent.add("Nothing is due");
    });
   //  error => agent.add(`nothing on schedule`)
   //  );
  
   
 }
  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/dialogflow-fulfillment-nodejs/tree/master/samples/actions-on-google
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Hours', getHours);
  intentMap.set('Check Schedule', checkSchedule);
  intentMap.set('Check Due', checkDue);
  agent.handleRequest(intentMap);
});

  // LIST ALL EVENTS WITHIN THE TIME RANGE
  function checkNow(dateTimeStart, dateTimeEnd, agent) {
    let start;
    let end;
    return new Promise((resolve, reject) => {
      calendar.events.list({
        auth: serviceAccountAuth,
        calendarId: calendarId,
        timeMin: dateTimeStart.toISOString(),
        timeMax: dateTimeEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      }, (err, calendarResponse) => {
        const events = calendarResponse.data.items;
        if (events.length) {
          agent.add('Listing events:');
          events.map((event, i) => {
            if (event.start.dateTime) {
              start = new Date(event.start.dateTime).toLocaleString(
                'en-US',
                { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', hour12: false, minute: 'numeric', timeZone: timeZone }
              );
              end = new Date(event.end.dateTime).toLocaleString(
                'en-US',
                { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', hour12: false, minute: 'numeric', timeZone: timeZone }
              );
              start = start.slice(0,21) + ' to ' + end.slice(13,21);
            } else if (event.start.date) {
              start = new Date(event.start.date).toLocaleString(
                'en-US',
                { weekday: 'short', month: 'short', day: '2-digit' }
              );
              start = start.slice(0,12);
            }
            agent.add(`${start} - ${event.summary}`);
            if (event.description !== undefined) {
              agent.add(`Description: ${event.description}`);
            }
          });
        resolve ('Done listing events.');  
        } else {
          resolve ('No events found for that time period.');
        }
      });
    });
  }
  // END CHECKNOW
function checkDueSub(dateTimeStart, dateTimeEnd, appointment_type, agent) {
 return new Promise((resolve, reject) => {
     calendar.events.list({
       auth: serviceAccountAuth, // List events for time period
       calendarId: calendarId,
       timeMin: dateTimeStart.toISOString(),
       timeMax: dateTimeEnd.toISOString()
     }, (err, calendarResponse) => {
       // Check if there is a event already on the Calendar
       if (err || calendarResponse.data.items.length < 1) {
         agent.add("testing");
         agent.add(calendarResponse.data.items.length + "");
         reject(err || 'Nothing on schedule');
       } else {
         var i = 0;
         var j = 0;
         for(i=0;i<calendarResponse.data.items.length;i++) {
           if(calendarResponse.data.items[i].summary.includes("DUE")) {
             j++;
             agent.add(calendarResponse.data.items[i].summary);
           }
         } 
         if(j > 0) {
         	resolve("complete: " + calendarResponse.data.items.length);
         }
         	else {
            reject(err || 'Nothing is due');
         }
       }
     });
   });
}
