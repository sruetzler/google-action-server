var Promise = require("bluebird");
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const fs = Promise.promisifyAll(require('fs'));
const io = require('socket.io');
const helmet = require('helmet');
const {aux, certificate} = require("google-action-util");

global.config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
const oauth = require("./lib/oauth");
const smarthome = require("./lib/smarthome");
const socketLogin = require("./lib/socket/login");
const socketLoggeIn = require("./lib/socket/loggedIn");

async function execute(){
	await certificate.initCertificate("rumo");

	let httpServer = new HTTPServer(global.config.httpsPort);
	let httpsServer = new HTTPSServer(global.config.httpPort);
	await httpsServer.open();

	let interval = 12*60*60*1000;
//	let interval = 10*1000;
	let checkCertificate = async function(){
		console.log("checkCertificate");
		try{
			await httpServer.open();
			if (await _checkCertificate()) await httpsServer.reconnect();
		}catch(err){
		}finally{
			await httpServer.close();
			setTimeout(checkCertificate,interval);
		}
	};
	setTimeout(checkCertificate,interval);
}


async function _checkCertificate(){
	try{
		let data = await aux.exec("./letsencrypt/cerbot.sh");
		return data.code !== 0;

	}catch(err){
		console.log(err);
	}
}


execute();

class HTTPServer{
	constructor(port){
		this.port = port;
		this.expressApp = express();
		this.expressApp.use(express.static("./letsEncrypeStatic", { dotfiles: 'allow' } ));
	}
	async open(){
		console.log("open http");
		this.httpServer = http.createServer(this.expressApp);
		this.httpServer.listen(this.port);
	}
	async close(){
		if(this.httpServer){
			console.log("close http");
			this.httpServer.close();
			delete this.httpServer;
		}
	}
	async reconnect(){
		await this.close();
		await this.open();
	}
}

class HTTPSServer{
	constructor(port){
		this.port = port;
		this.expressApp = express();

		this.expressApp.use(helmet());

		this.expressApp.use(bodyParser.urlencoded({extended : true}));
		this.expressApp.use(bodyParser.json());

		this.expressApp.use(express.static('./staticOAuth'));
		oauth(this.expressApp);
		// expressApp.use(function(req, res, next){
		// 	console.log(req.headers.loggedInUser, req.url, req.headers, req.body);
		// 	next();
		// });
		this.expressApp.use(express.static('./static'));
		smarthome.use(this.expressApp);
	}
	async open(){
		console.log("open https");
		let privateKey = await fs.readFileAsync('./letsencrypt/data/live/sruetzler.ddns.net/privkey.pem', 'utf8');
		let cert = await fs.readFileAsync('./letsencrypt/data/live/sruetzler.ddns.net/fullchain.pem', 'utf8');
		let ca = [
			await fs.readFileAsync('./letsencrypt/data/live/sruetzler.ddns.net/chain.pem', 'utf8'),
			await fs.readFileAsync('./keys/rumo-crt.pem', 'utf8'),
		];
		let options = {
			requestCert : true,
			rejectUnauthorized : false,
			ciphers : "TLSv1.2+HIGH:!aNULL:!3DES",
			key: privateKey,
			cert: cert,
			ca : ca
		};

		this.httpsServer = https.createServer(options, this.expressApp);
		let _io = io(this.httpsServer);
		_io.use(socketAuthorization);
		_io.of("/login" ).on('connection', socketLogin.onConnection);
		_io.of("/loggedIn" ).on('connection', socketLoggeIn.onConnection);

		this.httpsServer.listen(this.port);
		console.log("listening on port ",this.port);
	}
	async close(){
		if (this.httpsServer){
			console.log("close https");
			this.httpsServer.close();
			delete this.httpsServer;
		}
	}
	async reconnect(){
		await this.close();
		await this.open();
	}
}

function socketAuthorization(socket, next) {
	socket.peerCertificate = socket.client.request.client.getPeerCertificate();
	next();
}
