const Joi = require("joi");
const express = require("express");
const cors = require("cors");
const app = express();
const socket = require("socket.io");
const Room = require("./Room");
app.use(cors());

app.use(express.json());
// app.post();
// app.put();
// app.delete();

var room = {};



app.get("/api/:room_code/persons", (req, res) => {
    if (room[req.params.room_code] == null) {
        res.status(404).send("Room doesnt exist");
        return;
    }

    res.send(room[req.params.room_code].persons);
});

app.get("/api/persons/valid/:handle/:room_code/:select", (req, res) => {
    if (room[req.params.room_code] == null) {
        res.status(404).send("Room not found");

        return;
    }
    var person = room[req.params.room_code].persons.find(
        (p) => p.handle == req.params.handle
    );
    if (!person) {
        res.status(404).send("Handle not found");
        return;
    }

    res.send("Handle is present in the database");
});

app.get("/api/persons/:handle/:room_code/:select", (req, res) => {
    var ob = {
        handle: req.params.handle,
        room_code: req.params.room_code,
        select: req.params.select,
    };
    var roomflag = true;
    if (room[req.params.room_code] == null) {
        roomflag = false;
    }

    if (req.params.select == "ADMIN") {
        if (!roomflag) {
            res.send(ob);
        } else {
            res.status(409).send("Cannot use duplicate room code to create a room.");
        }

        return;
    }
    if (!roomflag) {
        res.status(404).send("Room doesnt Exist");
        return;
    }

    var person = room[req.params.room_code].persons.find(
        (p) => p.handle == req.params.handle
    );
    if (person) {
        res.status(409).send("Handle is already taken!");
        return;
    }
    if (req.params.select == "CANDIDATE") {
        person = room[req.params.room_code].persons.find(
            (p) => p.select == req.params.select
        );
        if (person) {
            res.status(409).send("A Candidate is already in the room!");
            return;
        }
    }

    res.send(ob);
});

app.get("/api/:room_code/chatlogs", (req, res) => {
    // console.log(chatlogs);
    if (room[req.params.room_code] == null) {
        res.status(404).send("Room doesnt exist");
        return;
    }
    res.send(room[req.params.room_code].chathistory);
});

app.get("/api/:room_code/code", (req, res) => {
    if (room[req.params.room_code] == null) {
        res.status(404).send("Room doesnt exist");
        return;
    }
    res.send(room[req.params.room_code].code);
});

app.get("/api/:room_code/question", (req, res) => {
    if (room[req.params.room_code] == null) {
        res.status(404).send("Room doesnt exist");
        return;
    }
    res.send(room[req.params.room_code].question);
});

app.get("/api/:room_code/submissionstatus", (req, res) => {
    var ob = {
        submitalert: room[req.params.room_code].submitalert,
        submitbuttondisable: room[req.params.room_code].submitbuttondisable,
        acceptbuttondisable: room[req.params.room_code].acceptbuttondisable,
        acceptalert: room[req.params.room_code].acceptalert,
        rejectalert: room[req.params.room_code].rejectalert,
    };

    res.send(ob);
});

app.get("/api/:room_code/selectedlanguage", (req, res) => {
    res.send(room[req.params.room_code].selectedlanguage);
});

app.post("/api/:room_code/persons/", (req, res) => {
    const person = {
        handle: req.body.handle,
        room_code: req.body.room_code,
        select: req.body.select,
    };
    if (person.select == "ADMIN") {
        room[req.params.room_code] = new Room();
    }
    room[req.params.room_code].persons.push(person);
    res.send(person);
});

app.delete("/api/:room_code/persons/:handle/:select", (req, res) => {
    if (room[req.params.room_code] == null) {
        res.status(404).send("Handle not found! Cannot be deleted.");
        return;
    }
    if (req.params.select == "ADMIN") {
        delete room[req.params.room_code];
        res.send("Room Deleted");
      
        return;
    }

    var person = room[req.params.room_code].persons.find(
        (p) => p.handle == req.params.handle
    );
    if (!person) {
        res.status(404).send("Handle not found! Cannot be deleted.");
        return;
    }
    const index = room[req.params.room_code].persons.indexOf(person);
    room[req.params.room_code].persons.splice(index, 1);
    res.send("Successfully left group");
});

//PORT

const port = process.env.PORT || 3000;

var server = app.listen(port, () => {
    console.log(`Server started ${port}`);
});
var io = socket(server);

io.on("connection", (socket) => {
    socket.on("room", (data) => {
        socket.join(data);
    });

    console.log("made connection");

    socket.on("question", (data) => {
        room[data.room_code].question = data.question;
        socket.to(data.room_code).emit("question", data.question);
    });

    socket.on("code", (data) => {
        room[data.room_code].code = data.code;
        socket.to(data.room_code).emit("code", data.code);
    });
    socket.on("doubleclicked", (data) => {
        //console.log(data);
        io.sockets.emit("doubleclicked", data);
    });
    socket.on("chat", (data) => {
        room[data.room_code].chathistory.logs.push(data.msg);
        room[data.room_code].chathistory.highlight.push(data.highlight);
        var len = room[data.room_code].chathistory.handle.length;

        if (
            len == 0 ||
            (len != 0 && data.handle != room[data.room_code].chathistory.pre_chat)
        ) {
            room[data.room_code].chathistory.handle.push(data.handle);
            room[data.room_code].chathistory.pre_chat = data.handle;
        } else {
            room[data.room_code].chathistory.handle.push("");
            room[data.room_code].chathistory.pre_chat = data.handle;
            data.handle = "";
           // console.log("data handle is ", data);
        }

        //console.log("Sent Chat is",data)
        io.sockets.to(data.room_code).emit("chat", data);
    });

    socket.on("newonline", (data) => {
        //console.log('newonline',data.person);
        socket.to(data.room_code).emit("newonline", data);
    });

    socket.on("leave", (data) => {
        socket.to(data.room_code).emit("leave", data);
    });

    socket.on("submitalert", (data) => {
       // console.log("hello", data);
        room[data.room_code].submitalert = data.submitalert;
        room[data.room_code].submitbuttondisable = data.submitbuttondisable;
        room[data.room_code].acceptbuttondisable = data.acceptbuttondisable;
        room[data.room_code].selectedlanguage = data.selectedlanguage;

        socket.to(data.room_code).emit("submitalert", data);
        //socket.to(data.room_code).emit('acceptbuttonenable',data.acceptbuttondisable);
    });

    socket.on("acceptalert", (data) => {
        //console.log("receieved accpet alert",data);
        room[data.room_code].submitalert = data.submitalert;
        room[data.room_code].acceptbuttondisable = data.acceptbuttondisable;
        room[data.room_code].acceptalert = data.acceptalert;
        socket.to(data.room_code).emit("acceptalert", data.acceptalert);
        //socket.to(data.room_code).emit('acceptbuttonenable',data.acceptbuttondisable);
    });

    socket.on("rejectalert", (data) => {
        //console.log("receieved accpet alert",data);
        room[data.room_code].submitalert = data.submitalert;
        room[data.room_code].acceptbuttondisable = data.acceptbuttondisable;
        room[data.room_code].rejectalert = data.rejectalert;
        socket.to(data.room_code).emit("rejectalert", data.rejectalert);
        //socket.to(data.room_code).emit('acceptbuttonenable',data.acceptbuttondisable);
    });

    socket.on("disconnect", () => {
        console.log("disconnected connection", socket.id);
    });
});
