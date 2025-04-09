// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload

// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?', type 'y', then press the enter key in the same terminal

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const multer = require('multer');

// our modules loaded from cwd

const { Connection } = require('./connection');
const cs304 = require('./cs304');

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data
app.use(flash());


app.use(serveStatic('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// ================================================================
// custom routes here

const DB = process.env.USER;
const DORM = 'dorm';
const ROOMS = 'rooms';

// main page. This shows the use of session cookies
app.get('/', (req, res) => {
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    console.log('uid', uid);
    return res.render('index.ejs', {uid, visits});
});

// route to submit room upload form
app.post('/submit', async (req, res) => {
    console.log("form submitted");
    const user = req.body.user;
    const reshall = req.body.reshall;
    const roomNum = req.body.room;
    const rating = req.body.rating;
    const sunlightLevel = req.body.sunlight;
    const noiseLevel = req.body.noise;
    const review = {
        user,
        rating,
        sunlightLevel,
        noiseLevel
      };
    const db = await Connection.open(mongoUri, DORM);
    const result = await db.collection(ROOMS).updateOne(
                            {reshall, roomNum}, // find documents with same reshall and roomNum 
                            { 
                                $push: {reviews: review}, // create a list of reviews
                                $setOnInsert: {reshall, roomNum}, // reshall and roomNum are not a list
                              },
                            {upsert: true} // insert if no reviews for the room already exist   
    );
    res.redirect('/');
});

// route to browse rooms in a res hall
app.get('/browse', async (req, res) => {
    const reshall = req.query.value;
    const db = await Connection.open(mongoUri, DORM);
    const rooms = await db.collection(ROOMS).find({reshall: reshall}).toArray(); 
    return res.render('roomList.ejs',
                        {rooms: rooms, 
                        reshall: reshall});
});

// shows how logins might work by setting a value in the session
// This is a conventional, non-Ajax, login, so it redirects to main page 
app.post('/set-uid/', (req, res) => {
    console.log('in set-uid');
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    res.redirect('/');
});

// shows how logins might work via Ajax
app.post('/set-uid-ajax/', (req, res) => {
    console.log(Object.keys(req.body));
    console.log(req.body);
    let uid = req.body.uid;
    if(!uid) {
        res.send({error: 'no uid'}, 400);
        return;
    }
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    console.log('logged in via ajax as ', req.body.uid);
    res.send({error: false});
});


// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
