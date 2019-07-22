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



/**all this code will need to be updated.**/

 // Enter your calendar ID below and service account JSON below
 const calendarId = "calendar id here";
 
 const serviceAccount = {
  "type": "service_account",
  "project_id": "sos-qwglii",
  "private_key_id": "4ba20c84944ebeefd6f6f7ea817e41b10dac38dd",
  "private_key": "add private key here",
  "client_email": "add client email here",
  "client_id": "add client id here",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/appointment-scheduler%40sos-qwglii.iam.gserviceaccount.com"
                        }; // Starts with {"type": "service_account",...
/**end all code to be updated**/
 

 // Set up Google Calendar Service account credentials

 const serviceAccountAuth = new google.auth.JWT({
   email: serviceAccount.client_email,
   key: serviceAccount.private_key,
   scopes: 'https://www.googleapis.com/auth/calendar'
 });

 
 const calendar = google.calendar('v3');
 process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements
 const timeZone = 'America/chicago';
 const timeZoneOffset = '-05:00';

 exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
   
 const agent = new WebhookClient({ request, response });

 console.log("Parameters", agent.parameters);

 const appointment_type = agent.parameters.AppointmentType;

   /*******I added this code*****************/
   function checkSchedule (agent) {
     const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0] + timeZoneOffset));
     const dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 1));
     const appointmentTimeString = dateTimeStart.toLocaleString(
       'en-US',
       { month: 'long', day: 'numeric', hour: 'numeric', timeZone: timeZone }
     );
     
     let promise = checkNow(dateTimeStart, dateTimeEnd, appointment_type, agent);
     
     return promise.then(
       result => agent.add(result + " - top"), 
       error => agent.add(`nothing on schedule top`)
       );
 }
   /*********/
   
   function makeAppointment (agent) {

     // Calculate appointment start and end datetimes (end = +1hr from start)
     //console.log("Parameters", agent.parameters.date);
     const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0] + timeZoneOffset));
     const dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 1));
     const appointmentTimeString = dateTimeStart.toLocaleString(
       'en-US',
       { month: 'long', day: 'numeric', hour: 'numeric', timeZone: timeZone }
     );

     // Check the availibility of the time, and make an appointment if there is time on the calendar
     return createCalendarEvent(dateTimeStart, dateTimeEnd, appointment_type).then(() => {
       agent.add(`Ok, let me see if we can fit you in. ${appointmentTimeString} is fine!.`);
     }).catch(() => {
       agent.add(`I'm sorry, there are no slots available for ${appointmentTimeString}.`);
     });
   }

   let intentMap = new Map();
   intentMap.set('Schedule Appointment', makeAppointment);
   intentMap.set('Check Schedule', checkSchedule);
   agent.handleRequest(intentMap);
 });

 function createCalendarEvent (dateTimeStart, dateTimeEnd, appointment_type) {

   return new Promise((resolve, reject) => {
     calendar.events.list({
       auth: serviceAccountAuth, // List events for time period
       calendarId: calendarId,
       timeMin: dateTimeStart.toISOString(),
       timeMax: dateTimeEnd.toISOString()
     }, (err, calendarResponse) => {
       // Check if there is a event already on the Calendar
       if (err || calendarResponse.data.items.length > 0) {
         reject(err || new Error('Requested time conflicts with another appointment'));
       } else {
         // Create event for the requested time period
         calendar.events.insert({ auth: serviceAccountAuth,
           calendarId: calendarId,
           resource: {summary: appointment_type +' Appointment', description: appointment_type,
             start: {dateTime: dateTimeStart},
             end: {dateTime: dateTimeEnd}}
         }, (err, event) => {
           err ? reject(err) : resolve(event);
         }
         );
       }
     });
   });
 }

/***I added this***/
function checkNow(dateTimeStart, dateTimeEnd, appointment_type, agent) {
 return new Promise((resolve, reject) => {
     calendar.events.list({
       auth: serviceAccountAuth, // List events for time period
       calendarId: calendarId,
       timeMin: dateTimeStart.toISOString(),
       timeMax: dateTimeEnd.toISOString()
     }, (err, calendarResponse) => {
       // Check if there is a event already on the Calendar
       if (err || calendarResponse.data.items.length < 1) {
         reject(err || new Error('Nothing on schedule bottom'));
       } else {
         agent.add(calendarResponse.data.items[0].summary + " - bottom");
         resolve(calendarResponse.data.items[0].summary);
       }
     });
   });
}
