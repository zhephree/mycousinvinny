/*
 * My COusin Vinny Checker
 * Geoffrey Gauchet / geoffreygauchet.com
 * this stuopid thing checks to see if the incredible film My Cousin Vinny
 * is on some TV channel right now and if so, it tweets it.
 * a less person would've turned this into a class with methods or whatever
 * but this is just a bunch of code that pollutes the global scope to do one
 * very specific thing.
*/
require("dotenv").config();
const Twit = require("twit");
const request = require("request");

//Set this to true to turn on the console logs and to turn off twitter posting
const test = true;
const alwaysLog = true;

console.log('hello')
console.log('env', process.env.CONSUMER_KEY,process.env.CONSUMER_SECRET,process.env.ACCESS_TOKEN,process.env.ACCESS_TOKEN_SECRET)

// this will check the keys and tokens saved in your .env file. you can get the keys/tokens from http://developer.twitter.com/en/apps
const bot = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  strictSSL: true
});

//this is a wrapper for console.log() and has a stupid Zelda reference for a name
const heyListen = (...args) => {
    if(test === true || alwaysLog === true){
        args.splice(0, 0, '🪓')
        console.log.apply(this, args);
    }
}

/*OnTVTonight breaks the schedule down into 4 arbitrary time periods. 
 * This uses the current time to figure out the time period.
 * "tHe TiMe ZoNe Is HaRdCoDeD" yeah this is a dumb app. change it in your fork
 * `Early` is 12:00am to 5:59am
 * `Morning` is 6:00am to 11:59pm
 * `Afternnon` is 12:00pm to 5:59pm
 * `Night` is 6:00pm to 11:59pm
 */
const getTVPeriod = () => {
  let now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}))
  let hour = now.getHours();
  let min = now.getMinutes();
  
  heyListen('time', hour, min)
  
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

/*
 * This just takes the current date and puts it into YYYY-MM-DD format
 * 100% guarantee there's a better way to do this
 */
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

//this takes a string like "10:30 pm" and converts it to a 24hour time string like "22:30"
const convertTime = (time) => { 
    heyListen("time",time)
    var hours = Number(time.match(/^(\d+)/)[1]);
    var minutes = Number(time.match(/:(\d+)/)[1]); 
    heyListen('mm', time.match(/\s(.*)$/))
    if(time.indexOf('pm') > -1 && hours<12) hours = hours+12;
    if(time.indexOf('am') > -1 && hours==12) hours = hours-12;
    var sHours = hours.toString();
    var sMinutes = minutes.toString();
    if(hours<10) sHours = "0" + sHours;
    if(minutes<10) sMinutes = "0" + sMinutes;
    return sHours + ":" + sMinutes;
}

/*
 * This takes a start and end time in the "HH:MM ap" format
 * and determines if the actual current time falls between them
 */
const testTime = (start, end) => {
  let now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}))
  heyListen(now.getHours(), start, end)
  heyListen(getDateString() + ' ' + convertTime(start))
  let startDate = new Date(getDateString() + ' ' + convertTime(start)).getTime();
  let endDate = new Date(getDateString() + ' ' + convertTime(end)).getTime();

  //sometimes it'll start at like 11pm and end at 2am, so this
  //handles that case so the 2am is for the next day
  //it's a very lazy way of handling this, but it's fine
  if(start.indexOf('pm') > -1 && end.indexOf('am') > -1){
    endDate = endDate + 86400000;
  }

  heyListen(now.getTime(), startDate, endDate)
  
  /* this isn't great, but if the NOW time is between START and END
   * then MCV is on right now, so return true.
   * if NOW is less than the START, then MCV is coming on soon, but isn't on right now, return 1
   * if NOW isn't inbetween START and END, return false
   * i really only doe anything important with the TRUE value.
   * the otthers are just tthere in case i ever make like a web page or an API or sometthing
   * sorry about the extra Ts my macbook keyboard has the keyboard problem
   */
  if(now.getTime() >= startDate && now.getTime() < endDate){
    return true;
  }else if(now.getTime() < startDate){
    return 1;
  }else{
    return false;
  }
}

//OnTVTonight returns the HTML in a cslash escaped string and this very
//lazily just removes all \ out of the string which for our purposes is fine
function stripslashes(str) {
  return str.replace(/\\/g, '')
}

/*
 * oooh baby this is it. this is where the magic happens and then Penn & Teller poke holes in it
 * the gist is that it hits a URL that they use to AJAXily load the table's HTML
 * and this takes that HTML and parses it to find out if and when MCV is on
 * and if it is on, then it gets the URL for that time slot to find out the
 * end time for this airing and does the functions up above to math it out
 * and eventually tweet or not tweet
 */
const getListings = () => {
  let period = getTVPeriod();
  let date = getDateString();
  let url = 'https://www.ontvtonight.com//guide/schedule?provider=X341764965&zipcode=70122&TVperiod=' + period + '&date=' + date + '&st=0&static_page=0';
  heyListen('url', url)
  
  request.get({
    url: url
  }, (err, response, body) => {
    heyListen('ok', err)
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
      heyListen('time', time[1])
      let urlStart = body.lastIndexOf('href="', vinDex);
      let urlFragment = body.substr(urlStart, 300);
      let urlMatches = urlFragment.match(/href="(.*?)" target/)
      let metaUrl = urlMatches[1].replace(/&amp;/g, '&')
      
      request.get({
        url: metaUrl
      }, (err, response, body) => {
        body = JSON.parse(JSON.stringify(body))
        let timeMatches = body.match(/<h5 class="thin">\n?(.*?)\n/m)[1].trim()
        heyListen('time matches', timeMatches)
        let etimeStart = timeMatches.indexOf('- ') + 2;
        let etimeEnd = timeMatches.indexOf(' |');
        let etime = timeMatches.substring(etimeStart, etimeEnd).replace(' ', '')
        heyListen('end time', etime)
        let stimeStart = 0;
        let stimeEnd = etimeStart - 2;
        let stime = timeMatches.substring(stimeStart, stimeEnd).replace(' ', '')
        heyListen('start time', stime)
        
        let tt = testTime(stime, etime);
        if(tt === true){
          heyListen('My Cousin Vinny is on ' + channelName);
          if(!test) {
              postStatus({status: 'My Cousin Vinny is on ' + channelName})
          }
        }else if(tt === 1){
          heyListen('My Cousin Vinny will be on at ' + stime + ' on ' + channelName);
        }else{
          heyListen('My Cousin Vinny ended at ' + etime + ' on ' + channelName);
        }
      })
    }else{
      heyListen('My Cousin Vinny is not on right now');
    }
  })
}

// this does some tweeting
function postStatus(params) {
  bot.post("statuses/update", params, (err, data, respone) => {
    if (err) {
      heyListen(err);
    } else {
      heyListen("Status posted on Twitter!!");
    }
  });
}

//run the main guy. this app is designed to run, do its shit, and then get outta here
getListings();