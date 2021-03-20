require("dotenv").config();
const express = require("express");
const app = express();

const Twit = require("twit");
const request = require("request");
const fs = require("fs");
const path = require("path");

// this will check the keys and tokens saved in your .env file. you can get the keys/tokens from http://developer.twitter.com/en/apps
const bot = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  strictSSL: true
});

// homepage

app.get("/", function(req, res) {
  var responseText = `<HTML><body style="background-color:#f8cc07;"></body><CENTER><a href="https://glitch.com/edit/#!/dailynasa?path=README.md:1:0" target="_blank"><img src="https://cdn.glitch.com/16911c91-6069-466c-8c5b-b930c5c622d4%2Fnasa_bot_image.png?v=1565634863542" alt="NASA Bot" style="width:px;height:400px;"></a></CENTER></HTML>`;
  res.send(responseText);
});

//get tvperiod

const getTVPeriod = () => {
  let now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}))
  let hour = now.getHours();
  let min = now.getMinutes();
  
  console.log('time', hour, min)
  
  if(hour < 0) {
    hour = 24 + hour;
    console.log('new time', hour, min)
  }
  
  if(hour >= 0 && hour < 6){
    return 'Early';
  }else if(hour >= 6 && hour < 12){
    return 'Morning';
  }else if(hour >= 12 && hour < 18){
    return 'Afternoon';
  }else if(hour >= 18 && hour <= 23){
    return 'Night';
  }
}

const getDateString = () => {
  let now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}));
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  if(m < 10){
    m = '0' + m;
  }
  let d = now.getDate();
  if(d < 10){
    d = '0' + d;
  }
  
  return y + '-' + m + '-' + d;
}

const testTime = (start, end) => {
  let now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}))

  
  let startDate = new Date(getDateString() + ' ' + start).getTime();
  let endDate = new Date(getDateString() + ' ' + end).getTime();
  if(start.indexOf('pm') > -1 && end.indexOf('am') > -1){
    endDate = endDate + 86400000;
  }
  
  if(now.getTime() >= startDate && now.getTime() < endDate){
    return true;
  }else if(now.getTime() < startDate){
    return 1;
  }else{
    return false;
  }
}

function stripslashes(str) {
 // return str.replace(/\\'/g,'\'').replace(/\"/g,'"').replace(/\\\\/g,'\\').replace(/\\0/g,'\0');
  return str.replace(/\\/g, '')
}

const getListings = () => {
  let period = getTVPeriod();
  let date = getDateString();
  let url = 'https://www.ontvtonight.com//guide/schedule?provider=X341764965&zipcode=70122&TVperiod=' + period + '&date=' + date + '&st=0&static_page=0';
 console.log('url', url)
  request.get({
    url: url
  }, (err, response, body) => {
    console.log('ok', err)
    body = stripslashes(JSON.parse(JSON.stringify(body)))
    let vinDex = body.toLowerCase().indexOf('my cousin vinny');
    if(vinDex > -1){
      let chStart = body.lastIndexOf('channelname', vinDex);
      let chFragment = stripslashes(body.substr(chStart, 700));
      let matches = chFragment && chFragment.length > 0? chFragment.match(/"_blank"\>(.*?)\<\/a>/g): '';
      let channel = matches;
      let channelName = channel[1].match(/>(.*?)</)[1];
      let vinnyFragment = body.substr(vinDex, 200);
      let time = vinnyFragment.match(/tvtime">(.*?)<\/span/)
      console.log('time', time[1])
      let urlStart = body.lastIndexOf('href="', vinDex);
      let urlFragment = body.substr(urlStart, 300);
      let urlMatches = urlFragment.match(/href="(.*?)" target/)
      let metaUrl = urlMatches[1].replace(/&amp;/g, '&')
      
      request.get({
        url: metaUrl
      }, (err, response, body) => {
        body = JSON.parse(JSON.stringify(body))
        let timeMatches = body.match(/<h5 class="thin">\n?(.*?)\n/m)[1].trim()
        console.log('time matches', timeMatches)
        let etimeStart = timeMatches.indexOf('- ') + 2;
        let etimeEnd = timeMatches.indexOf(' |');
        let etime = timeMatches.substring(etimeStart, etimeEnd).replace(' ', '')
        console.log('end time', etime)
        let stimeStart = 0;
        let stimeEnd = etimeStart - 2;
        let stime = timeMatches.substring(stimeStart, stimeEnd).replace(' ', '')
        console.log('start time', stime)
        
        let tt = testTime(stime, etime);
        if(tt === true){
          console.log('My Cousin Vinny is on ' + channelName);
          postStatus({status: 'My Cousin Vinny is on ' + channelName})
        }else if(tt === 1){
          console.log('My Cousin Vinny will be on at ' + stime);
        }else{
          console.log('My Cousin Vinny ended at ' + etime);
          postStatus({status: 'My Cousin Vinny ended at ' + etime})
        }
      })
      
      
    }else{
      console.log('My Cousin Vinny is not on right now');
    }
  })
}




// const os = require("os");
// const tmpDir = os.tmpdir();

// // this will call the NASA API

// const getPhoto = () => {
//   const parameters = {
//     url: "",
//     qs: {
//       api_key: process.env.NASA_KEY
//     },
//     encoding: "binary"
//   };
//   request.get(parameters, (err, respone, body) => {
//     body = JSON.parse(body);
//     saveFile(body);
//   });
// };

// // the section below checks if this is a video or image. the NASA API provides images and video URLs
// // if it's an image, it will save to the temporary directory, and in the case it's a video, we will save the URL to the video

// function saveFile(body) {
//   const fileName =
//     body.media_type.indexOf("image") != -1 ? "nasa.jpg" : "nasa.mp4";
//   const filePath = path.join(tmpDir + `/${fileName}`);

//   console.log(`saveFile: file PATH ${filePath}`);
//   if (fileName === "nasa.mp4") {
//     // tweet the link
//     const params = {
//       status: "Video time! 🍿 " + body.title + ": " + body.url
//     };
//     postStatus(params);
//     return;
//   }
//   const file = fs.createWriteStream(filePath);

//   request(body)
//     .pipe(file)
//     .on("close", err => {
//       if (err) {
//         console.log(err);
//       } else {
//         console.log("Media saved!");
//         const descriptionText = body.title;
//         uploadMedia(descriptionText, filePath);
//       }
//     });
// }

// // the section below uploads the NASA image to Twitter and returns a media ID

// function uploadMedia(descriptionText, fileName) {
//   console.log(`uploadMedia: file PATH ${fileName}`);
//   bot.postMediaChunked(
//     {
//       file_path: fileName
//     },
//     (err, data, respone) => {
//       if (err) {
//         console.log(err);
//       } else {
//         console.log(data);
//         const params = {
//           status: descriptionText,
//           media_ids: data.media_id_string
//         };
//         postStatus(params);
//       }
//     }
//   );
// }

// // the section below Tweets the media ID and sends a Tweet including the title

function postStatus(params) {
  bot.post("statuses/update", params, (err, data, respone) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Status posted on Twitter!!");
    }
  });
}

// below is setting the listening for incoming requests...
app.get(`/${process.env.BOT_ENDPOINT}`, function(req, res) {
  res.status(204).send();
  getListings();
});

// ... and this listens for requests! :)
const listener = app.listen(process.env.PORT, function() {
  console.log("🤖 is 👂🏽 on port " + listener.address().port);
});

