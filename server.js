var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var shortid = require("shortid");
var cors = require("cors");
var bodyParser = require("body-parser");
var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;
process.env.DB_URI =
  "mongodb+srv://ducmpham17:Phamminhduc1@cluster0-misdy.mongodb.net/userdata?retryWrites=true&w=majority";

/** this project needs a db !! **/

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}); 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//handle add new users
const schema = mongoose.Schema;
const userSchema = new schema({
  _id: String,
  username: String,
  exercise: []
});
var User = mongoose.model("User", userSchema);

app.post("/api/exercise/new-user", (req, res) => {
  let tempId = mongo.ObjectId().toString();
  const userName = req.body.username;

  var findUser = User.find({ username: userName }, (err, result) => {
    if (err) {
      console.log(err);
    } else if (result.length > 0) {
      res.send("Username already taken");
    } else {
      let newUser = new User({
        _id: tempId,
        username: userName,
        exercise: Array
      });
      newUser.save((err, d) => {
        if (err) {
          console.log(err);
        }
      });
      res.json(newUser);
    }
  });
});

// get all users
app.get("/api/exercise/users", (req, res) => {

  User.find({}, function(err, users) {
    var userMap = [];

    users.forEach(function(user) {
      userMap.push({
        _id: user._id,
        username: user.username
      });
    });
    res.json(userMap);
  });
});

//add exercise
const exerciseSchema = new schema({
  _id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
}); 

const Exercise = mongoose.model("Exercise", exerciseSchema);
app.post("/api/exercise/add", (req, res) => { 
  let date = req.body.date ===""? new Date().toDateString():new Date(req.body.date).toDateString()
  //let curDate = req.body.date ===""? new Date():new Date(req.body.date)
  let durationTime  =  parseInt(req.body.duration);
  let description = req.body.description;
  let query = req.body.userId;
  if(query == ""){return res.send("Path `userId` is required.")}
  if(req.body.description == ""){return res.send("Path `description` is required.")} 
  else if(req.body.duration == ""){return res.send("Path `duration` is required.")}
  else{
   User.find({_id : req.body.userId},(err,datas)=>{
    if(err){
      return res.json("Unknown userId") 
    } 
    if(datas.length == 0){
      res.json("Unknown userId")
    }
    else{
        let data = {_id : datas[0]._id, 
                    description : description, 
                    duration : durationTime, 
                    date : date, 
                    username : datas[0].username};
        let userExercise = new Exercise({
          _id : req.body.userId,
          description :req.body.description,
          duration : durationTime,
          date : date
        }) 
      if(datas[0] !== null){
        datas[0].exercise.push(userExercise);
        datas[0].save((err)=>{
        if(err){res.send("excercise Data could not be updated")}
          res.json(data); 
        })
        
      }else{ 
        res.send("Invalid Id")
      }
    }
   })
  }
})

//retrieve a full exercise log of any user

app.get("/api/exercise/log", (req, res) => { 
  var curUserId = req.query.userId;
  var from = req.query.from;
  var to = req.query.to;
  var limit = req.query.limit;
  
  console.log(curUserId + " " + from + " " + to)
  User.find({_id : curUserId}, (err, result) => {
    if (err) {
      return console.log(err);
    }
    if (result.length == 0) {
      return res.json("Unknown userId");
    }
    let exerciseDis = []
    if(from == null && to == null){
    result[0].exercise.map(item => {
      let a = {
        description : item.description,
        duration : parseInt(item.duration),
        date : item.date.toDateString()
      }
      exerciseDis.push(a)
    })}
    else if(from && to){
      result[0].exercise.map(item => {
        if(item.date.getTime() >  (new Date(from)).getTime() &&item.date.getTime() <  (new Date(to)).getTime()){
      let a = {
        description : item.description,
        duration : parseInt(item.duration),
        date : item.date.toDateString()
      }
      exerciseDis.push(a)
        }
    })
    }
    else if(from){
      result[0].exercise.map(item => {
        if(item.date.getTime() >  (new Date(from)).getTime()){
      let a = {
        description : item.description,
        duration : parseInt(item.duration),
        date : item.date.toDateString()
      }
      exerciseDis.push(a)
        }
    })
    }
    else if(to){
      result[0].exercise.map(item => {
        if(item.date.getTime() <  (new Date(to)).getTime()){
      let a = {
        description : item.description,
        duration : parseInt(item.duration),
        date : item.date.toDateString() 
      }
      exerciseDis.push(a)
        }
    })
    }
    
    if(limit){
      exerciseDis = exerciseDis.slice(0, limit); 
    }
    
    let data = {
      userId : result[0]._id,
      username : result[0].username,
      count : result[0].exercise.length,
      log : exerciseDis
    }
    res.json(data)
  });
});




//Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})



// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
