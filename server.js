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


//file upload
//Configure Multer from readings 

app.use('/uploads', express.static('uploads')); // folder for static files 

// configure storage property of Multer from readings 
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname).slice(1);
        let hhmmss = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
  })

  
// upload using milter module 
var upload = multer({ storage: storage, limits: { fileSize: 10_000_000 } }); // increase size too for video

// error handling middleware
app.use((err, req, res, next) => {
    console.log('error', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
        console.log('file too big');
        req.flash('error', 'File too big');
        res.redirect('/');
    } else {
        console.error(err.stack);
        res.status(500).send('Something went wrong!');
    }
});
// ================================================================
// custom routes here

const DB = process.env.USER;
const DORM = 'dorm';
const ROOMS = 'rooms';

// main page. This shows the use of session cookies
app.get('/', async (req, res) => {
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;

    const db = await Connection.open(mongoUri, DORM);
    const history = await db.collection(ROOMS).find({}).toArray();

    res.render('index.ejs', { uid, visits, submissions: history });
});

// route to submit room upload form
app.post('/submit', upload.array('photos', 10), async (req, res) => {
    console.log("form submitted");
    const user = req.body.user;
    const reshall = req.body.reshall;
    const roomNum = req.body.room;
    const rating = req.body.rating;
    const sunlightLevel = req.body.sunlight;
    const noiseLevel = req.body.noise;
    const FILES = 'files';
    
    //for when a file is uploaded, will know the path 
    let filePaths = req.files.map(file => '/uploads/' + file.filename);
    const review = {
        user,
        rating,
        sunlightLevel,
        noiseLevel,
        photos: filePaths // array of file paths
    };
    
    const db = await Connection.open(mongoUri, DORM);
    const result = await db.collection(ROOMS).updateOne(
                            {reshall, roomNum}, // find documents with same reshall and roomNum 
                            { 
                                $push: {reviews: review}, // create a list of reviews
                                $setOnInsert: {reshall, roomNum}, // reshall and roomNum are not a list
                              },
                            {upsert: true}, // insert if no reviews for the room already exist 
                            

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

app.post('/delete', async (req, res) => {
    const reshall = req.body.reshall;
    const roomNum = req.body.roomNum;

    const db = await Connection.open(mongoUri, DORM);
    await db.collection(ROOMS).deleteOne({ reshall: reshall, roomNum: roomNum });

    res.redirect('/');
});


// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// start server
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});


