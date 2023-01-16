import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const PORT = 5000;
const server = express();
let db;

try{
    await mongoClient.connect();
    db = mongoClient.db();
}
catch(error){
    console.log("Erro na conexão do servidor!");
}

server.use(express.json());
server.use(cors());
server.listen(PORT);

server.get('/participants', async(req, res) => {
    try{
        const gettingParticipants = await db.collection('participants').find().toArray();

        return res.status(200).send(gettingParticipants);
    }
    catch(error){
        return res.status(500).send(error.message);
    } 
});

server.get('/messages', async(req, res) => {
    const limite = parseInt(req.query.limite);
    const user = req.headers.user; 

    try{
        const gettingMessages = await db.collection('messages').find().toArray();
        const gettingUserMessages = gettingMessages.filter((message) => message.to === user || (message.to === 'Todos' || message.to === 'todos') || message.from === user);

        if(limite === undefined){
            return res.status(200).send(gettingUserMessages.reverse());
        }
        else{
            return res.status(200).send(gettingUserMessages.slice(-limite).reverse());
        }
    }
    catch(error){
        return res.status(500).send(error.message);
    }
});

server.post('/participants', async(req, res) => {
    const msgUser = joi.object({name: joi.string().required()});
    const userName = {name: req.body.name};
    const userValidation = msgUser.validate(userName);

    if (userValidation.error) {
        return res.status(422).send('Name deve ser string não vazio!');
    };

    try{
        const existingName =  await db.collection('participants').findOne({name: req.body.name});

        if(existingName) return res.status(409).send('Este nome já está sendo utilizado!');

        await db.collection('participants').insertOne({name: req.body.name, lastStatus: Date.now()});

        return res.sendStatus(201);
    }
    catch(error){
        return res.status(500).send(error.message);
    }
});

server.post('/messages', async(req, res) => {
    const {to, text, type} = req.body;
    const userName = req.headers.user; 
    const msgUser = joi.object(
        {
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().required().valid('message', 'private_message') 
        }
    );
    const message = {to: to, text: text, type: type};
    const userValidation = msgUser.validate(message, {abortEarly: false});

    if (userValidation.error) {
        const errors = userValidation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    };

    try{
        const existingName = await db.collection('participants').findOne({name: userName});

        if(!existingName){
            return res.status(422).send('O from deve ser um participante existente na lista de participantes');
        };

        await db.collection('messages').insertOne(
            {
                from: userName,
                to: to,
                text: text,
                type: type,
                time: dayjs().format('HH:mm:ss')
            }
        );

        return res.sendStatus(201);
    }
    catch(error){
        return res.status(500).send(error.message);
    }
});

server.post('/status', async(req, res) => {
    const user = req.headers.user;

    try{
        const existingName = await db.collection('participants').findOne({name:user});

        if(!existingName) return res.sendStatus(404);

        await db.collection('participants').updateOne(
            { name: user },
            {$set: {lastStatus: Date.now()}}
        );

        return res.sendStatus(200);
    }
    catch(error){
        return res.status(500).send(error.message);
    }
});

setInterval(async() => {

    try{
        const gettingParticipants = await db.collection('participants').find().toArray();
        
        gettingParticipants.map(async(participant) => {
            if(participant.lastStatus / 1000 > 1000){
                await db.collection('messages').insertOne(
                    {
                        from: participant.name,
                        to: 'Todos',
                        text: 'sai da sala...',
                        type: 'message',
                        time: dayjs().format("HH:mm:ss")
                    }
                )
            }
        });
    }
    catch(error){
        console.log("Erro na conexão do servidor!");
    }  

}, 15000);