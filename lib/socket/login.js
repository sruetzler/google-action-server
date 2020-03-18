const REST = require("./REST");
const aux = require("../_aux");
const forge = require("node-forge");
const certificate = require("../certificate");

let data = require("../data");

let clientIds = {};
let index = 0;

function onConnection(socket){
	let privat = {
		id : ++index,
		rest : new REST(socket)
	};
	socket.on('disconnect', disconnect(privat));
	privat.rest.on("GET","/login", onLogin(privat));
}

function disconnect(privat) {return function() {
	if (clientIds[privat.id]) delete clientIds[privat.id];
};}

function onLogin(privat){return async (/*request*/)=>{
	let rumoClientId = aux.makeId(128);
	clientIds[privat.id] = {
		rumoClientId : rumoClientId,
		privat : privat
	};
	return "/login.html?rumo_client_id=" + rumoClientId;
};}

async function onLoggedIn(req, res, userId){
	let rumoClientId = req.body.rumo_client_id;
	let privat = getPrivat(rumoClientId);
	try{
		if (!privat) throw "unkown rumo_client_id";
		let csr = await privat.rest.get("/csr?rumo_client_id=" +rumoClientId);
		let cert = await signCsr(csr,rumoClientId);
		let ret = await privat.rest.post("/cert",cert);
		if (!ret) throw "save cert failed";
		await (await data.addUser(userId)).addRumoClientId(rumoClientId, cert, "rumo");
		const responseurl = "/loggedIn.html";
		res.status(200)
		.json(responseurl);
	}catch(err){
		console.error(err);
		let error = err;
		try{
			if (err.errorMsg) error = err.errorMsg;
		}catch(err){}
		res.status(500).json({
			error : error
		});
	}
}

function getPrivat(rumoClientId){
	for (let id in clientIds){
		if (clientIds[id].rumoClientId === rumoClientId) return clientIds[id].privat;
	}
}

async function signCsr(pemCsr,expectedRumoClientId){
	var csr = forge.pki.certificationRequestFromPem(pemCsr);
	let rumoClientId = csr.subject.getField("OU").value;
	if (rumoClientId !== expectedRumoClientId) throw "invalid client id";

	return await createCertificate(pemCsr);
}

async function createCertificate(csrPem){
	let {key,crt} = await certificate.getKeys("rumo");
	let pki = forge.pki;
	var csr = pki.certificationRequestFromPem(csrPem);
	let serverCert = pki.certificateFromPem(crt);
	let serverKey = pki.privateKeyFromPem(key);

	if(!csr.verify()) {
			throw new Error('Signature not verified.');
		}

	var cert = pki.createCertificate();
	cert.publicKey = csr.publicKey;
	cert.serialNumber = (new Date().getTime()/1000).toString();
	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 31);

	cert.setSubject(csr.subject.attributes);
	cert.setIssuer(serverCert.subject.attributes);
	var extensions = csr.getAttribute({name: 'extensionRequest'});
	if (extensions) cert.setExtensions(extensions.extensions);

	cert.sign(serverKey,forge.md.sha256.create());
	return pki.certificateToPem(cert);
}

module.exports = {
	onConnection : onConnection,
	onLoggedIn : onLoggedIn
};
