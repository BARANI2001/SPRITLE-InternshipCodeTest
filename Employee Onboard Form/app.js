require('dotenv').config();

var nodemailer = require('nodemailer');

const express = require('express');

const app = express();

const passport = require('passport');

const session = require('express-session');

const facebookStrategy = require('passport-facebook').Strategy;

const GoogleStrategy = require('passport-google-oauth2').Strategy;

var moment = require('moment');
const { response } = require('express');

var MongoClient = require('mongodb').MongoClient;
var uri = "mongodb+srv://DSAT:x738hbfRlU9ggNkI@cluster0.ddm2y.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

var dbo;
MongoClient.connect(uri, function(err, DB) {
  if (err) throw err;
  dbo = DB.db("Employee");
});

app.set("view engine","ejs")
app.use(session({
    secret: 'secret',
    cookie: {maxAge: 600000},
    resave: false,
    saveUninitialized: true
}
));
app.use(passport.initialize());
app.use(passport.session()); 

passport.use(new facebookStrategy({
    clientID        : "685861142607394",
    clientSecret    : "cb5f679187b396f40ecbbd162053c180",
    callbackURL     : "http://localhost:5000/facebook/callback",
    profileFields   : ['id', 'displayName', 'name', 'gender', 'picture.type(large)','email']

},
function(token, refreshToken, profile, done) {
    process.nextTick(function() {

    dbo.collection("user").findOne({ 'uid' : profile.id }, function(err, user) {
        if (err)
            return done(err);

        if (user) {
            console.log("user found");
            console.log(user);
            return done(null, user);
        } else {
            var newUser ={
                uid : profile.id,                
                token : token,                    
                firstName : profile.name.givenName,
                lastName :  profile.name.familyName, 
                email : profile.emails[0].value, 
                gender : profile.gender,
                pic : profile.photos[0].value,
                isRegistered : 0
            }
            dbo.collection("user").insertOne(newUser, function(err, insertResult) {
                if (err)
                    throw err;

                console.log(insertResult);
                return done(null, newUser);
            });
        }

    });

    })
}));

passport.use(new GoogleStrategy({
    clientID: '6907128578-hbl3uqmac7akj1r8mpvq5vj8c9hnhtif.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: "http://localhost:5000/google/callback",
    profileFields: ['id', 'displayName', 'name', 'gender', 'picture.type(large)','email']
},
function(token, refreshToken, profile, done) {
    process.nextTick(function() {

    dbo.collection("user").findOne({ 'uid' : profile.id }, function(err, user) {
        if (err)
            return done(err);

        if (user) {
            console.log("user found");
            console.log(user);
            return done(null, user);
        } else {
            newUser ={
                uid : profile.id,                
                token : token,                    
                firstName : profile.name.givenName,
                lastName :  profile.name.familyName, 
                email : profile.emails[0].value, 
                gender : profile.gender,
                pic : profile.photos[0].value,
                isRegistered : 0
            }
            dbo.collection("user").insertOne(newUser, function(err, insertResult) {
                if (err)
                    throw err;
                    
                console.log(insertResult);
                return done(null, newUser);
            });
    }

    });

    })

}));

passport.serializeUser(function(user, done) {
    done(null, user.uid);
});

passport.deserializeUser(function(id, done) {
    dbo.collection("user").findOne( {uid: id}, function(err, user) {
        if (err)
            throw err;

        done(err, user);
    });
});

var transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
    port: 465,
    secure: true,
	service: 'Gmail',
	auth: {
	  user: 'reusedonation@gmail.com',
	  pass: 'pragrbyesfhpbuii'
	}
});

app.get('/userform', isLoggedIn, function(req, res) {

    dbo.collection("user").findOne( {uid: req.user.uid, isRegistered: 0}, function(err, findResult) {
        if(err)
            throw err;

        if(!findResult){
            res.redirect('profile');
        } else{
            console.log(req.user)
            res.render('userform', {user : req.user });
            
        }
});


});

app.get('/profile', isLoggedIn, function(req, res) {
    console.log(req.user)
    res.render('profile', {
        user : req.user 
    });
});

app.get('/logout', function(req, res) {
    req.session = null;
    req.logout();
    res.redirect('/');
});

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect('/');
}

app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

app.get('/facebook/callback',
		passport.authenticate('facebook', {
			successRedirect : '/userform',
			failureRedirect : '/'
		}
));

app.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/google/callback',
		passport.authenticate('google', {
			successRedirect : '/userform',
			failureRedirect : '/'
		}
));

app.get('/',(req,res) => {
    res.render("home")
});

app.post('/updateForm', (req, res)=>{ 
    req.session.loggedin = true; 
    try {
        req.session.address = req.body.address;
        req.session.tenth = req.body.tenth;
        req.session.twelfth = req.body.twelfht;
        req.session.ug = req.body.ug;
        req.session.pg = req.body.pg;        
    } catch (error) {
        req.session.address = 'Chennai';
        req.session.tenth = 'Our angel mat. hr. sec. school';
        req.session.twelfth = 'Our angel mat. hr. sec. school';
        req.session.ug = 'NIL';
        req.session.pg = 'College of engineering guindy';
    }
    finally{
        req.session.save();
        res.redirect('submitDetails');
    }
})

app.get('/submitDetails', isLoggedIn, (req, res)=>{
    const d = new Date();
    var currentDate = moment().format('MM/DD/YYYY');

    dbo.collection("user").updateOne(
        { uid : req.user.uid},
        {$set:{
            joinDate : req.session.joinDate,
            address : req.session.address,
            tenth : req.session.tenth,
            twelfth : req.session.twelfth,
            ug : req.session.ug,
            pg : req.session.pg,
            joinDate : currentDate,
            lastFilled : d.getTime(),
            isRegistered : 1

        }}, function(err, updateResult) {
        if (err)
            throw err;
            
        let name = req.user.firstName + ' ' + req.user.lastName;
        var mailOptions = {
            from: 'reusedonation@gmail.com',
            to: 'reusedonation@gmail.com',
            subject: name + ' has filled the form',
            html:  "<h3> Hey admin, " + name +" has filled the form with mail id - "+ 
                req.user.email+ " on "+ currentDate+"</h3>"
            };
        
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
                alert('Some error occured while filling the form');
                res.redirect('userForm')
            } else {
                console.log('Email sent: ' + info.response);
                console.log('Message sent: %s', info.messageId);   
                res.redirect('profile');
                alert('Filled the form succesfully');
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                
            }
            });
    });
});

app.listen(5000,() => {
    console.log("App is listening on Port 5000")
});
