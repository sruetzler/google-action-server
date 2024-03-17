const express = require('express');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const mqtt = require('mqtt');
var daten = {"verriegelt":true,"zeiten":[]};
var verbindungen = new Array();



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

      console.log(JSON.parse(fs.readFileSync('./fridge/data/secret.json')).usernameMqtt);

      const broker = 'mqtts://sruetzler.de:8883';
      const clientId = 'HenriFridge';
      const username = credentials.usernameMqtt;
      const password = credentials.passwordMqtt;

      const options = {
        clientId,
        username,
        password,
        cleanSession: true,
        rejectUnauthorized: false,
        ca: null // oder []
      };

      this.client = mqtt.connect(broker, options);
    }

    test = "";

    basicAuthMiddleware = basicAuth({
      users: { 'admin': 'admin' }, // Hier deine Benutzername-Passwort-Kombinationen eintragen
      challenge: true,
      unauthorizedResponse: 'Unauthorized'
    });


}


module.exports = Fridge
