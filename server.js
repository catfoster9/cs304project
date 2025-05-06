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
const bcrypt = require('bcrypt');

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

const ROUNDS = 15;
const DBNAME = "bcrypt";
const USERS = "users";

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
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;

    const username = req.session.username || null;
    const db = await Connection.open(mongoUri, DORM);
    const user_history = await db.collection(ROOMS).find({"reviews.user": username}).toArray();

    res.render('index.ejs', {visits, submissions: user_history,
                            loggedIn: req.session.loggedIn || false,
                            username: req.session.username || null});
});

// route to sign up user
app.post("/join", async (req, res) => {
    try {
      const username = req.body.username;
      const password = req.body.password;
      const db = await Connection.open(mongoUri, DBNAME);
      var existingUser = await db.collection(USERS).findOne({username: username});
      if (existingUser) {
        req.flash('error', "Login already exists - please try logging in instead.");
        return res.redirect('/')
      }
      const hash = await bcrypt.hash(password, ROUNDS);
      await db.collection(USERS).insertOne({
          username: username,
          hash: hash
      });
      console.log('successfully joined', username, password, hash);
      req.flash('info', 'successfully joined and logged in as ' + username);
      req.session.username = username;
      req.session.loggedIn = true;
      return res.redirect('/hello');
    } catch (error) {
      req.flash('error', `Form submission error: ${error}`);
      return res.redirect('/')
    }
  });

  // login route
app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, DBNAME);
        var existingUser = await db.collection(USERS).findOne({username: username});
        console.log('user', existingUser);
        if (!existingUser) {
        req.flash('error', "Username does not exist - try again.");
        return res.redirect('/')
        }
        const match = await bcrypt.compare(password, existingUser.hash); 
        console.log('match', match);
        if (!match) {
            req.flash('error', "Username or password incorrect - try again.");
            return res.redirect('/')
        }
        req.flash('info', 'successfully logged in as '
        
        + username);
        req.session.username = username;
        req.session.loggedIn = true;
        console.log('login as', username);
        return res.redirect('/hello');
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
    }
}); 

// homepage route after logging in
app.get('/hello', async (req,res) => {
    if (!req.session.loggedIn) {
      req.flash('error', 'You are not logged in - please do so.');
      return res.redirect("/");
    }
    const username = req.session.username || null;
    const db = await Connection.open(mongoUri, DORM);
    const user_history = await db.collection(ROOMS).find({"reviews.user": username}).toArray();

    res.render('index.ejs', {submissions: user_history,
                            loggedIn: req.session.loggedIn || false,
                            username: req.session.username || null});
}); 

// logout button route
app.post('/logout', (req,res) => {
    if (req.session.username) {
        req.session.username = null;
        req.session.loggedIn = false;
        req.flash('info', 'You are logged out');
        return res.redirect('/');
    } else {
        req.flash('error', 'You are not logged in - please do so.');
        return res.redirect('/');
    }
});

// route to submit room upload form
app.post('/submit', upload.array('photos', 10), async (req, res) => {
    if (!req.session.loggedIn) {
        req.flash('error', 'You must be logged in to upload a dorm.');
        return res.redirect('/');
      }

    console.log("form submitted");
    const user = req.session.username;
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

// route to delete a room
app.post('/delete', async (req, res) => {
    const reshall = req.body.reshall;
    const roomNum = req.body.roomNum;
    const username = req.session.username;
    const reviewIndex = parseInt(req.body.reviewIndex); // find which specific review index to delete

    const db = await Connection.open(mongoUri, DORM);
    const room = await db.collection(ROOMS).findOne({reshall: reshall, roomNum: roomNum});
    const review = room.reviews[reviewIndex];
    if (review.user !== username) {
        req.flash('error', 'You are not authorized to delete this review.');
        return res.redirect('/');
    }

    room.reviews.splice(reviewIndex, 1);
    await db.collection(ROOMS).updateOne({reshall, roomNum},
                                        {$set: {reviews: room.reviews}});

    res.redirect('/');
});


// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// start server
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});


