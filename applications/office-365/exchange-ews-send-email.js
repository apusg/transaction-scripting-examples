/*
    A script that monitors Office 365 / Exchange mail services used by Outlook clients.
    This script sends an email and measures the response of the EWS API.
    More https://docs.microsoft.com/en-us/exchange/client-developer/exchange-web-services/start-using-web-services-in-exchange
    Author: primoz@thousandeyes.com
*/

import { markers, credentials } from 'thousandeyes';
import fetch from 'node-fetch';
import assert from 'assert';

// EWS endpoint URL, typically https://<your-exchange-server>/EWS/Exchange.asmx for Exchange,
// or https://outlook.office365.com/EWS/Exchange.asmx for Office 365.
let url = 'https://outlook.office365.com/EWS/Exchange.asmx';
let username = '<<sender username>>' // thousandeyestest@outlook.com
// Base64 hash of 'username:password'. You can create one locally with:
//   echo -n thousandeyestest\@outlook.com:pa$$w0rd | base64
// (don't forget to escape @ with \)
let base64credentials = '<<base64 hash of username:password string>>';
let emailRecipient = '<<recipient email>>'; // primoz@thousandeyes.com

let emailSender = username;
let emailSenderName = 'ThousandEyes EWS Transaction Test';
let emailSubject = 'ThousandEyes EWS Transaction Test';
let emailBody = 'This email has been sent from a ThousandEyes transaction test using Exchange EWS API.';


let body = `
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types" xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
  <soap:Header>
    <t:RequestServerVersion Version="V2016_04_13" />
  </soap:Header>
  <soap:Body>
    <CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" MessageDisposition="SendAndSaveCopy">
      <Items>
        <t:Message>
          <t:Subject>` + emailSubject + `</t:Subject>
          <t:Body BodyType="HTML">` + emailBody + `</t:Body>
          <t:ToRecipients>
            <t:Mailbox>
              <t:EmailAddress>` + emailRecipient + `</t:EmailAddress>
            </t:Mailbox>
          </t:ToRecipients>
          <t:From>
            <t:Mailbox>
              <t:Name>` + emailSenderName + `</t:Name>
              <t:EmailAddress>` + emailSender + `</t:EmailAddress>
            </t:Mailbox>
          </t:From>
          <t:IsRead>false</t:IsRead>
        </t:Message>
      </Items>
    </CreateItem>
  </soap:Body>
</soap:Envelope>
`;

runScript();

async function runScript() {

    await markers.start('Send Email');
    let response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "Authorization": "Basic " + base64credentials
        },
        body: body.trim()
    });
    await markers.stop('Send Email');

    if (response.status != 200) {
        console.log("HTTP Error: " + response.status + " " + response.statusText);
        await assert(false, "HTTP Error: " + response.status + " " + response.statusText);
    }

    let content = await response.text();

    let responseCode;
    let res = content.match(/<m:ResponseCode>(.*)<\/m:ResponseCode>/);
    if ((res) && (res.length > 1)) {
        responseCode = res[1]
    } else {
        // Unhandled error
        console.log("Error: " + content);
        await assert(false, "Error: " + content);
    }

    if (responseCode == 'NoError') {
        console.log('Email sent!');
    } else {
        res = content.match(/<m:MessageText>(.*)<\/m:MessageText>/);
        if ((res) && (res.length > 1)) {
            console.log("Response Error: " + responseCode + " - " + res[1]);
            await assert(false, "Response Error: " + responseCode + " - " + res[1]);
        } else {
            console.log("Response Error: " + responseCode);
            await assert(false, "Response Error: " + responseCode);
        }
    }
};
