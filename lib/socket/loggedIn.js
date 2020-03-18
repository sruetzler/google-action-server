const REST = require("./REST");
//const aux = require("../_aux");
const smarthome = require("../smarthome");

let data = require("../data");

let clientIds = {};
let index = 0;

function getPrivat(rumoClientId){
	for (let id in clientIds){
		if (clientIds[id].rumoClientId === rumoClientId) return clientIds[id].privat;
	}
	throw "unknown rumo client id";
}

function onConnection(socket){
	if (!socket.request.client.authorized) return;
	let rumoClientId = socket.server.sockets.sockets[socket.conn.id].peerCertificate.subject.OU;
	let user = data.getUserFromRumoClientId(rumoClientId);
	if (!user) return;
	let privat = {
		id : ++index,
		rest : new REST(socket),
		rumoClientId : socket.server.sockets.sockets[socket.conn.id].peerCertificate.subject.OU,
		loggedInUser : user.user
	};
	clientIds[privat.id] = {
		rumoClientId : rumoClientId,
		privat : privat
	};
	socket.on('disconnect', disconnect(privat));
	privat.rest.on("DELETE","/disconnect", onDisconnect(privat));
	privat.rest.on("POST","/actDevices", onActDevice(privat));
	privat.rest.on("PUT","/reportState", onReportState(privat));

}

function disconnect(privat) {return function() {
	if (clientIds[privat.id]) delete clientIds[privat.id];
};}

function onDisconnect(privat){return async (/*request*/)=>{
	return await data.disconnectRumoClient(privat.rumoClientId);
};}

function onActDevice(privat){return async request=>{
	if (!Array.isArray(request.body)) request.body = [request.body];
	let changed = data.setActDevices(privat, request.body);
	console.log("onActDevice changed",changed);
	if (changed) await smarthome.requestSync(privat.loggedInUser);
	return true;
};}

async function query(user, deviceId){
	let {rest, devId} = getRestForDevice(user, deviceId);
	return await rest.get("/query?deviceId=" + devId);
}

async function execute(user,deviceId,execution){
	let {rest, devId} = getRestForDevice(user, deviceId);
	return await rest.put("/execute?deviceId=" + devId, execution);
}

function getRestForDevice(user,deviceId){
	let {rumoClientId, devId} = data.getRumoClientIdForDevice(user, deviceId);
	console.log("query",rumoClientId);
	let privat = getPrivat(rumoClientId);
	if (privat.loggedInUser !== user) throw "wrong user";
	return {rest : privat.rest, devId};
}

function onReportState(privat){return async (request)=>{
	return await smarthome.reportState(privat.loggedInUser, privat.rumoClientId, request.query.deviceId, request.body);
};}

module.exports = {
	onConnection : onConnection,
	query : query,
	execute : execute
};
