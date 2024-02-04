const express = require('express');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
var daten = {"verriegelt":false,"zeiten":[]};
var verbindungen = new Array();


class Fridge{
  constructor(){
    this.datenLaden();

  }


    close (){

    }
    use (expressApp){
      // expressApp.settings('views', './fridge/lib/views');
      expressApp.set('view engine', 'ejs');

/*      expressApp.use((req, res, next) =>{
        if (req.url.startsWith("/fridge")) {
          next();
        }
      });*/

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

 /*     expressApp.use((req, res) =>{
        res.status(404).render('404', {title: '404'});
      });*/
    }

    datenSpeichern() {
      var json = JSON.stringify(daten);
      fs.writeFile('./fridge/data/daten.json', json , () =>{
          // console.log('file has written')
      });
      verbindungen.forEach(function (list) {
        try{
          const socket = list[1];
          // console.log(socket);
          socket.emit('data', JSON.stringify(daten));
        }catch(error){
          console.error(error);
        }
      })
    
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

    wsUebergeben(_io){
      const io = _io;
      io.of("/fridge" ).on('connection', (socket) => {
        console.log('a user connected');
        var id = null;
        
        
        if (verbindungen.length != 0) {
          id = verbindungen[verbindungen.length -1][0] +1;
        }else{
          id = 0;
        }
        verbindungen.push([id, socket]);
        // verbindungen[0][1].emit('data', JSON.stringify(daten));
        verbindungen[verbindungen.length -1][1].emit('data', JSON.stringify(daten));
        // socket.emit('data', JSON.stringify(daten));
        // console.log(verbindungen);
        

        socket.on('disconnect', () => {
          console.log('user disconnected');
          for (let i = 0; i < verbindungen.length; i++) {
            const stelle = verbindungen[i][0];
            if (id == stelle) {
              verbindungen.splice(i, 1);
              break;
            }
            
          }
          // console.log(verbindungen);
        });





        // socket.on("hugo", (data, cb)=>{
        //   console.log(data)
        //   socket.emit("emil",data, (response)=>{

        //   });
        // })
      });
    }

    basicAuthMiddleware = basicAuth({
      users: { 'admin': 'admin' }, // Hier deine Benutzername-Passwort-Kombinationen eintragen
      challenge: true,
      unauthorizedResponse: 'Unauthorized'
    });


}


module.exports = Fridge
