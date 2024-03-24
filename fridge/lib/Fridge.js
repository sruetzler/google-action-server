const express = require('express');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const mqtt = require('mqtt');
const bcrypt = require('bcryptjs');
var daten = {"verriegelt":true,"zeiten":[]};
var verbindungen = new Array();
const benutzerWeb = JSON.parse(fs.readFileSync('./fridge/data/benutzerWeb.json', 'utf-8'));

// console.log(bcrypt.hashSync('password', 10));


class Fridge{
  
  constructor(){
    this.datenLaden();
    this.mqttClient();

  }


    close (){

    }
    use (expressApp){
      // expressApp.settings('views', './fridge/lib/views');
      expressApp.set('view engine', 'ejs');



      expressApp.set('views', './fridge/views');

      expressApp.use("/fridge",this.basicAuthMiddleware ,express.static('./fridge/static'));


      expressApp.get('/fridge', (req, res) => {
        res.render('index', {title: 'Home'});
      });

      expressApp.get('/fridge/settings', (req, res) => {
        res.render('settings', {title: 'Einstellungen'});
      });

      expressApp.get("/fridge/statusSwitch", (req, res) =>{
        res.send(JSON.stringify(daten));
      });


      expressApp.get("/fridge/validatepassword", (req, res) =>{
        const username = atob(req.headers['authorization'].split(' ')[1]);
        // console.log(username);
        const parts = username.split(":");
        // console.log(parts[1]);

        res.send(JSON.stringify(parts[1]));
      });

      expressApp.put('/fridge/swClick', (req, res) =>{
        if (req.body == 'true') {
            daten['verriegelt'] = true;
        }else{
            daten['verriegelt'] = false;
        }
        this.datenSpeichern();
        res.status(200).send();
      });

      expressApp.put('/fridge/neueDaten', (req, res) =>{
        daten['zeiten'].push(req.body);
        this.datenSpeichern();
        res.status(200).send();
      });

      expressApp.put('/fridge/changePassword', (req, res) =>{
        // console.log(req);
        // console.log("Aufgerufen")
        res.status(200).send();
      });

      expressApp.post('/fridge/datenAktualisieren', (req, res) =>{
        // console.log(req.body['id']);
        daten['zeiten'][req.body['id']] = req.body;
        this.datenSpeichern();
        res.status(200).send();
      });

      expressApp.delete('/fridge/datenDelete', (req, res) =>{
        // console.log(req.body);
        // daten['zeiten'][req.body['id']];
        daten['zeiten'].splice(req.body['id'],1);
        // console.log(daten);
        this.datenSpeichern();
        res.status(200).send();
      });

      expressApp.use((req, res, next) =>{
        if (req.url.startsWith("/fridge")) {
          res.status(404).render('404', {title: '404'});
        }
        next();
      });
    }

    datenSpeichern() {
      var json = JSON.stringify(daten);
      fs.writeFile('./fridge/data/daten.json', json , () =>{
          // console.log('file has written')
      });
      const options = {
        qos: 1
      };

      this.client.publish('henri/fridge', JSON.stringify(daten), options);
    
    }

    datenLaden() {
      fs.readFile('./fridge/data/daten.json', (err, data)=>{
          if (err) {
              console.log(err);
              this.datenSpeichern();
              return;
          }
          // console.log(data.toString());
          // daten = data.toString();
          daten = JSON.parse(data);
          // console.log(daten);
      });
    }

    mqttClient(){

      const credentials = JSON.parse(fs.readFileSync('./fridge/data/secret.json'));

      // console.log(JSON.parse(fs.readFileSync('./fridge/data/secret.json')).usernameMqtt);

      const broker = 'mqtts://sruetzler.de:8883';
      const clientId = 'HenriFridge123';
      const username = credentials.usernameMqtt;
      const password = credentials.passwordMqtt;

      const options = {
        // clientId,
        username,
        password,
        // cleanSession: true,
        rejectUnauthorized: false,
        ca: null // oder []
      };

      this.client = mqtt.connect(broker, options);

      this.client.on('connect', () => {
        // console.log('Connected');
        this.client.subscribe('henri/neuVerbunden', () =>{
          // console.log('Subscribe to topic');
        })
      });

      this.client.on("error",err=>{
        console.error(err)
      });

      this.client.on("disconnect",()=>{
        // console.log("disconnected");
      });

      this.client.on('message', (topic, payload) => {
        // console.log('Received Message:', topic, payload.toString())
        if (topic == 'henri/neuVerbunden') {
          this.client.publish('henri/fridge', JSON.stringify(daten), options);
        }
      });

    }

    authorizer = (username, password) => {
      const user = benutzerWeb.find(user => user.username === username);
      // const hashedPassword = users[username];
      if (!user) {
        return false; // User not found
      }
    
      return bcrypt.compareSync(password, user.password); // Securely compare passwords
    };

    basicAuthMiddleware = basicAuth({
      authorizer: this.authorizer,
      challenge: true, // Send WWW-Authenticate header on failed attempts
      unauthorizedResponse: 'Unauthorized'
    });
}


module.exports = Fridge