const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const MongoStore = require('connect-mongo');



app.set("view engine", "ejs");
//Express:
app.use("/static", express.static(path.join(__dirname, "src")));
app.use(express.urlencoded());
app.use(express.json()); //Parsing Json
app.use(cookieParser());

//Using cookieParser:
/*
app.use(session({
    resave: false,
    saveUninitialized: true,
    // secret: process.env.SECRET,
    secret: process.env.SECRET,
    cookie: {
        // maxAge:1000*60*10//60s*10 = 10 mins
        maxAge: 1000 * 60*10
    }
    //Note: If the maxage of cookie is not set. The session will remain active only until the browser is not closed. If maxage is given, the duration of the cookie and session to be existing can be set beyond that.
    //Here, the session will expire after 30 seconds of logging in, irrespective of wheter the user closes or keeps the browser open.
}));
*/

//connect-mongo
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL, // Make sure this is correct
        collectionName: 'sessions', // Optional: name the collection for sessions
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 10, // 10 minutes
        secure: process.env.NODE_ENV === 'production', // Ensure cookies are secure in production
        httpOnly: true,
        sameSite: 'lax'
    }
}));

app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
});



//MongoDB:
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connection Established"))
    .catch(err => console.log(err));

//Schema for signup:
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    pass: String,
    dob: Date
});
//Creating New Collection Users
const Users = mongoose.model('Users', userSchema);

//Feedback Schema
const fdSchema = new mongoose.Schema({
    email:String,
    msg:String
});

//Creating New Collection Feedbacks
const Feedbacks = mongoose.model('Feedbacks', fdSchema);

//Endpoints:
app.get("/", (req, res) => {
    if (req.session.user) {
        res.status(200).render(path.join(__dirname, 'src/views', 'index'),{User:req.session.username});
    }
    else {
        // res.sendFile((path.join(__dirname, "src/views", 'login.html')));
        res.redirect('/login');
    }
    // res.status(200).render(path.join(__dirname,'src/views','index'));

});
app.get("/blog", (req, res) => {
    if (req.session.user) {
        res.status(200).render(path.join(__dirname, 'src/views', 'blog'),{User:req.session.username});
    }
    else {
        // res.sendFile((path.join(__dirname, "src/views", 'login.html')));
        res.redirect('/login');
    }
    
});
app.get("/geolocation", (req, res) => {
    if (req.session.user) {
        res.status(200).render(path.join(__dirname, 'src/views', 'geolocation'),{User:req.session.username});
        
    }
    else {
        // res.sendFile((path.join(__dirname, "src/views", 'login.html')))
        res.redirect('/login');
    }
    
});
app.get("/gallery", (req, res) => {
    if (req.session.user) {
        res.status(200).render(path.join(__dirname, 'src/views', 'gallery'),{User:req.session.username});
    }
    else {
        // res.sendFile((path.join(__dirname, "src/views", 'login.html')));
        res.redirect('/login');
    }
    
});
app.get("/contact", (req, res) => {
    if (req.session.user) {
        res.status(200).render(path.join(__dirname, 'src/views', 'contact'),{User:req.session.username});
    }
    else {
        // res.sendFile((path.join(__dirname, "src/views", 'login.html')));
        res.redirect('/login');
    }

    // res.status(200).render(path.join(__dirname, 'src/views', 'contact'));
});

app.get("/signup", (req, res) => {
    res.sendFile((path.join(__dirname, "src/views", 'signup.html')))
});
app.get("/login", (req, res) => {
    res.sendFile((path.join(__dirname, "src/views", 'login.html')))
});

app.post("/signup", async (req, res) => {

    console.log(req.body);
    const { name, email, pass, dob } = req.body;


    try {
        const existingUser = await Users.find({ email: email });
        if (existingUser.length === 0) {
            const entry = new Users({ name, email, pass, dob });
            // entry.speak();
            await entry.save();
            res.json({ success: true });
            //And redirect to login using javascript

        } else {
            return res.json({ success: false, message: 'User already exists' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post("/login", async (req, res) => {
    console.log(req.body);
    const { email, pass } = req.body;

    try {
        const existingUser = await Users.find({ email: email, pass: pass });
        if (existingUser.length === 0) {
            // const entry = new UsersRegistered({ username, name, age, gender, address, more });
            // entry.speak();
            // await entry.save();

            return res.json({ success: false, message: 'Invalid User' });
        } else {
            console.log('Login By:',existingUser[0].name);
            req.session.user = email;
            req.session.username = existingUser[0].name;
            req.session.save();
            
            res.json({ success: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

//Feedback
app.post("/contact", async (req, res) => {
    const { msg} = req.body;
    const email = req.session.user;
    console.log(email,msg);

    try {
        const entry = new Feedbacks({email,msg});
            // entry.speak();
            await entry.save();
            res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

//When user logs out
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

//SERVER:
app.listen(process.env.PORT, () => {
    console.log("App started on Port: " + process.env.PORT);
});
