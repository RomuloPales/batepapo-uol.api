import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
let participants;
let messages;

mongoClient.connect().then(() => {
    db = mongoClient.db("batePapoUol");
    messages = db.collection("messages");
    participants = db.collection("participants");
});


app.post('/participants', async (req, res) => {
    
    const newParticipant = req.body;
    const getParticipants = await participants.find().toArray()
    getParticipants.forEach((participant) =>{
            if(participant.name === newParticipant.name){
            res.sendStatus(409)
        }else{
            try{
        
                newParticipant.lastStatus = Date.now();
                if (!names.includes(req.body.name)) {
                    names.push(req.body.name);
                    participants.push(newParticipant);
                    messages.push({
                        from: req.body.name,
                        to: 'Todos',
                        text: 'entra na sala...',
                        type: 'status',
                        time: dayjs().format('HH:MM:SS'),
                    });
            
                    participants.insertOne(req.body).then(() => {
                        res.sendStatus(201)
                        return;
                    })
                    
                } else {
                    res.sendStatus(400);
                    return;
                }
            }catch{}
            
        }
        
        })
   
});

app.get('/participants', (req, res) => {
    participants.find().toArray().then((participants) => {
        res.send(participants);
    })

});

app.get('/messages', async (req, res) => {
    try{
        const limit = req.query.limit;
        const newMessages = await messages.find().toArray(); 
        console.log(newMessages);
        const filterMessages = newMessages.filter((m, i) => {
            return m.to === 'Todos' || m.to === req.headers.user;
        });
        res.send(filterMessages.slice(-limit));
    }
    catch{

    }
    
});

app.post('/messages', (req, res) => {
    const username = req.headers.user;

    if (req.body.to === '' || req.body.text === '') {
        res.sendStatus(400);
    } else if (
        req.body.type !== 'message' &&
        req.body.type !== 'private_message'
    ) {
        res.sendStatus(422);
    } else if (!names.includes(username)) {
        res.sendStatus(422);
    } else {
        let newMessages = req.body;
        newMessages.from = username;
        newMessages.time = dayjs().format('HH:MM:SS');
        messages.push(newMessages);

    }
    messages.insertOne(req.body).then(() => {
        res.sendStatus(200);
        return;
    })
});

app.post('/status', (req, res) => {
    const username = req.headers.user;
    if (!names.includes(username)) {
        res.sendStatus(400);
    }
    if (participants.length !== 0) {
        participants.find((p, i) => {
            return p.name === username;
        }).lastStatus = Date.now();
    }
});

setInterval(() => {
    db.collection("participants").
    participants.forEach((p, i) => {
        if (p.lastStatus < Date.now() - 10000) {
            messages.push({
                from: `${p.name}`,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: `${dayjs().format('HH:MM:SS')}`,
            });
            participants.splice(i, 1);
            names.splice(i, 1);
        }
    });
}, 15000); 


app.listen(5000, () => {
    console.log('Tudo certo pra dar errado');
});