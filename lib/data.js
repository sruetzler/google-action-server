var Promise = require("bluebird");
const fs = Promise.promisifyAll(require('fs'));
const aux = require("./_aux");
const _ = require('lodash');

const dataFile="./data.json";

class Data{
	constructor(data){
		this.users = {};
		if (data){
			for (let user in data){
				this.users[user] = new User(user, data[user]);
			}
		}
	}
	async addUser(user){
		if (this.users[user]) return this.users[user];
		this.users[user] = new User(user);
		await save();
		return this.users[user];
	}
	async delete(user){
		delete this.users[user];
		await save();
	}
	getUser(user){
		return this.users[user];
	}
	getUsers(){
		return Object.keys(this.users);
	}
	getAgentId(user){
		return this.users[user].agentId;
	}
	getUserFromRumoClientId(rumoClientId){
		for (let user in this.users){
			if (this.users[user].hasRumoClientId(rumoClientId)) return this.users[user];
		}
	}
	getUserFromCode(code){
		for (let user in this.users){
			if (this.users[user].hasCode(code)) return this.users[user];
		}
	}
	getUserFromRefreshToken(refreshToken) {
		for (let user in this.users){
			if (this.users[user].hasRefreshToken(refreshToken)) return this.users[user];
		}
	}
	checkAccessToken(accessToken,scope) {
		for (let user in this.users){
			if (this.users[user].checkAccessToken(accessToken,scope)) return this.users[user];
		}
	}
	async disconnect(accessToken){
		for (let user in this.users){
			if (await this.users[user].disconnect(accessToken)){
				if (this.users[user].hasNoConnections()){
					delete this.users[user];
					await save();
				}
				return true;
			}
		}
	}
	async disconnectRumoClient(rumoClientId){
		for (let user in this.users){
			if (await this.users[user].disconnectRumoClient(rumoClientId)){
				if (this.users[user].hasNoConnections()){
					delete this.users[user];
					await save();
				}
				return true;
			}
		}
		return false;
	}
	setActDevices(privat, devices){
		let rumoClientId = getRumoClient(this, privat);
		if (!rumoClientId) throw "unkown client";
		return rumoClientId.setActDevices(devices);
	}
	getDevices(user){
		if (!this.users[user]) return [];
		return this.users[user].getDevices();
	}
	getRumoClientIdForDevice(user, deviceId){
		if (!this.users[user]) return;
		let {rumoClientId, devId} =  this.users[user].getRumoClientIdForDevice(deviceId);
		if (!rumoClientId) throw "unknown device";
		return {rumoClientId, devId};
	}
	getGlobalDeviceId(user, rumoClientId, deviceId){
		if (!this.users[user]) return;
		let devId =  this.users[user].getGlobalDeviceId(rumoClientId, deviceId);
		if (!devId) throw "unknown device";
		return devId;
	}
	serialize(){
		let data = {};
		for (let user in this.users){
			data[user] = this.users[user].serialize();
		}
		return data;
	}
}

function getRumoClient(that, privat){
	if (!that.users[privat.loggedInUser]) return;
	return that.users[privat.loggedInUser].getRumoClient(privat);
}

class User{
	constructor(user,data){
		this.user = user;
		this.authCodes = {};
		this.rumoClientIds = {};
		if (data){
			this.agentId = data.agentId;
			for (let authCode in data.authCodes){
				this.authCodes[authCode] = new AuthCode(authCode, null, data.authCodes[authCode]);
			}
			for (let rumoClientId in data.rumoClientIds){
				this.rumoClientIds[rumoClientId] = new RumoClientId(rumoClientId, null, null, data.rumoClientIds[rumoClientId]);
			}
		}
		else this.agentId = aux.makeId(20);
	}
	async addCode(code, scope){
		if (this.authCodes[code]) return;
		this.authCodes[code] = new AuthCode(code, scope);
		await save();
	}
	async addRumoClientId(rumoClientId, cert, scope){
		if (this.rumoClientIds[rumoClientId]) return;
		this.rumoClientIds[rumoClientId] = new RumoClientId(rumoClientId, cert, scope);
		await save();
	}
	hasRumoClientId(rumoClientId){
		if (this.rumoClientIds[rumoClientId]) return this;

	}
	hasCode(code){
		for (let authCode in this.authCodes){
			if (this.authCodes[authCode].code === code) return this;
		}
	}
	hasRefreshToken(refreshToken){
		for (let authCode in this.authCodes){
			if (this.authCodes[authCode].refreshToken === refreshToken) return this;
		}
	}
	checkAccessToken(accessToken,scope){
		for (let authCode in this.authCodes){
			if (this.authCodes[authCode].accessToken && this.authCodes[authCode].accessToken.token === accessToken &&
				this.authCodes[authCode].scope === scope){
				let actTime = (new Date).getTime();
				if (actTime <= this.authCodes[authCode].accessToken.endTime) return this;
				else return;
			}
		}
	}
	async disconnect(accessToken){
		for (let authCode in this.authCodes){
			if (this.authCodes[authCode].accessToken && this.authCodes[authCode].accessToken.token === accessToken){
				delete this.authCodes[authCode];
				await save();
				return true;
			}
		}
	}
	async disconnectRumoClient(rumoClientId){
		if (!this.rumoClientIds[rumoClientId]) return;
		delete this.rumoClientIds[rumoClientId];
		await save();
		return true;
	}
	getAuthCode(code){
		for (let authCode in this.authCodes){
			if (this.authCodes[authCode].code === code) return this.authCodes[authCode];
		}
	}
	getAuthCodeFromRefreshToken(refreshToken){
		for (let authCode in this.authCodes){
			if (this.authCodes[authCode].refreshToken === refreshToken) return this.authCodes[authCode];
		}
	}
	hasNoConnections(){
		return Object.keys(this.authCodes).length === 0 &&  Object.keys(this.rumoClientIds).length === 0;
	}
	getRumoClient(privat){
		return this.rumoClientIds[privat.rumoClientId];
	}
	getDevices(){
		let devices = [];
		for (let rumoClientId in this.rumoClientIds){
			devices = devices.concat(this.rumoClientIds[rumoClientId].getDevices());
		}
		return devices;
	}
	getRumoClientIdForDevice(deviceId){
		for (let rumoClientId in this.rumoClientIds){
			let devId = this.rumoClientIds[rumoClientId].hasGlobalDevice(deviceId);
			if (devId) return { rumoClientId, devId};
		}
	}
	getGlobalDeviceId(rumoClientId, deviceId){
		if (!this.rumoClientIds[rumoClientId]) throw "unknown rumo client id";
		return this.rumoClientIds[rumoClientId].hasLocalDevice(deviceId);
	}
	serialize(){
		let data = {
			agentId : this.agentId,
			authCodes : {},
			rumoClientIds : {}
		};
		for (let authCode in this.authCodes){
			data.authCodes[authCode] = this.authCodes[authCode].serialize();
		}
		for (let rumoClientId in this.rumoClientIds){
			data.rumoClientIds[rumoClientId] = this.rumoClientIds[rumoClientId].serialize();
		}
		return data;
	}
}


class AuthCode{
	constructor(code, scope, data){
		this.code = code;
		this.scope = scope;
		if (data){
			this.scope = data.scope;
			this.accessToken = data.accessToken;
			this.refreshToken = data.refreshToken;
		}
	}
	async setAccessToken(token, endTime){
		this.accessToken = {token : token, endTime : endTime};
		await save();
	}
	async setRefreshToken(token){
		this.refreshToken = token;
		await save();
	}
	getAccessToken(){
		return this.accessToken;
	}
	serialize(){
		return {
			scope : this.scope,
			accessToken : this.accessToken,
			refreshToken : this.refreshToken
		};
	}
}

class RumoClientId{
	constructor(rumoClientId, cert, scope, data){
		this.rumoClientId = rumoClientId;
		this.cert = cert;
		this.scope = scope;
		this.devices = [];
		if (data){
			this.cert = data.cert;
			this.scope = data.scope;
			this.devices = data.devices;
		}
	}
	setActDevices(devices){
		if (!_.isEqual(this.devices, devices)){
			this.devices = devices;
			return true;
		}
		return false;
	}
	getDevices(){
		return this.devices.map(device=>{
			device = _.clone(device);
			device.id = convertDevIdToGlobal(this,device.id);
			return device;
		});
	}
	hasGlobalDevice(deviceId){
		deviceId = convertDevIdToLocal(this,deviceId);
		if (this.devices.reduce((found,device)=>{
			return found || device.id === deviceId;
		},false)) return deviceId;
	}
	hasLocalDevice(deviceId){
		if (this.devices.reduce((found,device)=>{
			return found || device.id === deviceId;
		},false)) return convertDevIdToGlobal(this,deviceId);
	}
	serialize(){
		return {
			cert : this.cert,
			scope : this.scope,
			devices : this.devices
		};
	}
}

function convertDevIdToGlobal(that,id){
	return that.rumoClientId + "_" + id;
}

function convertDevIdToLocal(that,id){
	return id.replace(new RegExp("^" + that.rumoClientId + "_"),"");
}

let d;
try{
	d = fs.readFileSync(dataFile,"utf8");
	d = JSON.parse(d);
}catch(err){}

let data  = new Data(d);

async function save(){
	let d = data.serialize();
	await fs.writeFileAsync(dataFile,JSON.stringify(d,null,2),"utf8");
}

module.exports = data;
