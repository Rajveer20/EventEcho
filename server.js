const express = require('express');
require('dotenv').config();
const mysql = require('mysql2');
var genuuid = require('uuid');
const sessions = require('express-session');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const jwt = require('jsonwebtoken'); 
const {sendMail} = require('./public/sendMail.js');
const bcrypt = require('bcryptjs');

var session;

const con = mysql.createConnection({
    host:process.env.SQL_HOST,
    port:process.env.SQL_PORT,
    user:process.env.SQL_USER,
    password:process.env.SQL_PASS,
    database:process.env.SQL_DATABASE
});

con.connect(function(err){
    if(err){
        console.log(err);
    }else{
        console.log("Connected");
    }
});

const port = process.env.PORT;
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(sessions({ 
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false,expires:1000*60*60*24 }
}));
app.use(flash());

app.get('/home',(req,res)=>{
    var event_ids =[];
    if(req.session.userId != null){
        var query = `SELECT event_id FROM registration WHERE id = ?`
        con.query(query,[req.session.userId], (err,data)=>{
            if(err)
                console.log(err);
            else{
                if(data.length > 0){
                    for(let i=0; i<data.length; i++){
                        event_ids.push(data[i]);
                    }
                }
                res.render('index', {session: req.session, registered: event_ids});
            }
        })
    }
    else{
        res.render('index', {session: req.session, registered: event_ids});
    }
    
});
app.get('/',(req,res)=>{
    var event_ids =[];
    if(req.session.userId != null){
        var query = `SELECT event_id FROM registration WHERE id = ?`
        con.query(query,[req.session.userId], (err,data)=>{
            if(err)
                console.log(err);
            else{
                if(data.length > 0){
                    for(let i=0; i<data.length; i++){
                        event_ids.push(data[i]);
                    }
                }
                res.render('index', {session: req.session, registered: event_ids});
            }
        })
    }
    else{
        res.render('index', {session: req.session, registered: event_ids});
    }
    
});
app.get('/login',(req,res)=>{
    res.render('login', {
        login_error : req.flash('login_error')
    });
});
app.get('/register',(req,res)=>{
    res.render('register', { 
        email_error : req.flash('email_error'), 
        pass_error : req.flash('pass_error')
    });
});
app.get('/logout',(req,res)=>{
    req.session.destroy((err) => {
        res.redirect('/home'); 
    })
})
app.get('/event', (req,res)=>{
    res.render('home');
});

app.get('/verify/:token', (req, res) => { 
    const { token } = req.params; 

    // Verifying the JWT token  
    jwt.verify(token, process.env.SECRET, function(err, decoded) { 
        if (err) { 
            console.log(err); 
            res.sendFile( __dirname + "/public/verify_failed.html" );
        } 
        else{
            // Update the user's verification status in the database
            var query = `UPDATE users SET verified = true WHERE email = ?`;
            con.query(query, [decoded.data], (err, data) => {
                if (err) {
                    res.sendFile( __dirname + "/public/verify_failed.html" );
                } else {
                    console.log("Verified in Database");
                    res.sendFile( __dirname + "/public/verify_success.html" );
                }
            });
        }
    });

});

app.post('/event', (req,res)=>{
    var eventId = req.body.eventId;
    console.log(req.session.userId);
    console.log(req.body.eventId);
    if(req.session.userId != null){
        var query = `INSERT INTO registration (id,event_id) VALUES (?,?)`;
        con.query(query,[req.session.userId, eventId], (err,data)=>{
            if(err){
                console.log(err);
            }else{
                console.log("insert operation successful");
            }
        });
        let mailSubject = "EventEcho - Registered for New Event.";
        let content = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Registered Events</title><style>body {font-family: Arial, sans-serif;}h1{color:#7B2CBF;}table {width: 100%;border-collapse: collapse;margin-top: 20px;;}th, td {border: 1px solid #ddd;padding: 8px;text-align: left;}th {background-color: #f2f2f2;}</style></head><body><h1>EventEcho</h1><h2>Your Registered Events</h2><table><thead><tr><th>Event Name</th><th>Date</th></tr></thead><tbody>';

        var event_query = `SELECT event_name,event_date FROM events as e JOIN registration as r ON e.event_id = r.event_id WHERE r.id=?`;
        con.query(event_query,[req.session.userId],(err,data)=>{
            if(err){
                console.log(err);
            }else{
                
                for(let i = 0; i<data.length; i++){
                    var date = data[i].event_date.toString();
                    console.log("I am in "+ i + " times");
                    content += '<tr><td>';
                    content += data[i].event_name;
                    content += '</td><td>';
                    content += date.substring(0,15);
                    content +='</td></tr>';
                }
                content += '</tbody></table></body></html>';
                console.log("Content :" + content );
                var getEmail = `SELECT email FROM users WHERE id = ?`
                con.query(getEmail,[req.session.userId], (err,data)=>{
                    if(err)
                        console.log(err)
                    else{
                        console.log("Email : "+data[0].email);
                        sendMail(data[0].email,mailSubject,content);
                    }
                });
            }
        });
        
        setTimeout(function () { res.redirect('/home'); }, 2000);
    }
    else{
        res.redirect("/register");
    }
});

app.post('/register',(req,res)=>{
    var count = 0;
    var fname = req.body.fname;
    var lname = req.body.lname;
    var email = req.body.mail;
    var mobile = req.body.phone;
    var password = req.body.password;
    var hashedPassword;
    //encryption of password
    bcrypt.genSalt(10,function(err, Salt){
        bcrypt.hash(password, Salt, function(err,hash){
            if(err)
                return console.log('cannot encrypt');
                console.log(hash);
            hashedPassword = hash;
            console.log(hashedPassword);

        })
    })
    var confirm_password = req.body['user-password-confirm'];
    //Handling Password and Confirm Password do not match
    if(password != confirm_password){
        req.flash('pass_error', 'Passwords do not match');
        count++;
    }


    //Handling Duplicate Email Insertion
    var check = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    con.query(check,[email], (err,data)=>{
        if(err){
            console.log(err);
        }else{
            console.log(data.length);
            if(data.length>0){
                console.log("Successful Retrieval: ", data[0].email)
                if(data[0].email === email){
                    req.flash('email_error', 'Email already exists');
                    count++;
                }
            }
        }

        if(count > 0){
            res.redirect('/register');
        }
        else{
            var query = `INSERT INTO users (fname,lname,email,mobile,password,verified) VALUES (?,?,?,?,?,?)`;
                    con.query(query,[fname,lname,email,mobile,hashedPassword,false], (err,data)=>{
                        if(err){
                            console.log(err);
                        }else{
                            console.log("insert operation successful");
                        }
                    });

                    const token = jwt.sign({ 
                            data: email 
                        }, process.env.SECRET, { expiresIn: '10m' } 
                     );
                    
                     let mailSubject = "EventEcho Mail Verification.";
                     let content = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Email Verification</title></head><body><div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; max-width: 500px; margin: 20px auto;"><h2>Hello '+fname+'!</h2><p>Thank you for signing up. To continue, please verify your email address by clicking the button below:</p><a href="http://https://eventecho.onrender.com/verify/'+token+'"style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px;">Verify Email</a><p>If the above button does not work, you can also click on the link below:</p><p><a href="http://localhost:3000/verify'+token+'">Click here to verify your email</a></p><p>This Verification Link will expire in 10 minutes.</p></div></body></html>';
                     sendMail(email,mailSubject,content);

            res.redirect('/login');
        }
    });
});

app.post('/login',(req,res)=>{
    var count = 0;
    var email = req.body.mail;
    var password = req.body.password;
    //encrypt before check
    

    //Matching Login Details
    var check = `SELECT * FROM users WHERE email = ?`;
    con.query(check,[email], (err,data)=>{
        if(err){
            console.log(err);
        }else if(data.length>0){
            bcrypt.compare(password, data[0].password,
                async function (err, isMatch) {
        
                    if (!isMatch || err) {
                        count++;
                        req.flash('login_error',"Email or Password do no match");
                    }
                    else if(data[0].verified == false){
                        count++;
                        req.flash('login_error',"Please check Email for verification");
                    }
                    else{
                        console.log('Encrypted password is: ', password);
                        console.log('Decrypted password is: ', data[0].password);
                        req.session.user = data[0].fname;
                        req.session.userId=data[0].id;
                        req.session.save();
                    }
                })
            if(data.length==0){
                count++;
                req.flash('login_error',"Email or Password do no match");
            }
            else if(data[0].verified == false){
                count++;
                req.flash('login_error',"Please check Email for verification");
            }
            else{
                req.session.user = data[0].fname;
                req.session.userId=data[0].id;
                req.session.save();
            }
        }else{
            count++;
            req.flash('login_error',"Email or Password do no match");
        }

        if(count > 0){
            res.redirect('/login');
        }
        else{
            res.redirect('/home');    
        }
    });
 
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server started at http://localhost:${port}`)
});