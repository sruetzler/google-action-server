const { smarthome } = require('actions-on-google');
const {aux, Defer} = require("google-action-util");
const fs = require('fs');
let data = require("./data");
let loggedIn;

setImmediate(()=>{
	loggedIn = require("./socket/loggedIn");
});

const app = smarthome({ debug: false,
	jwt : JSON.parse(fs.readFileSync(config.keys.serviceAccountKey))});

app.onDisconnect(async (body,headers)=> {
	if (headers.authorization) await data.disconnect(headers.authorization.replace(/^Bearer /,""));
	return true;
});

app.onSync(async (body,headers) => {
	console.log("onSync", body, headers);
	let devices = data.getDevices(headers.loggedInUser);
	console.log(devices);
	return {
		requestId: body.requestId,
		payload: {
			agentUserId: data.getAgentId(headers.loggedInUser),
			devices: devices
		}
	};
});

app.onQuery(async (body,headers) => {
	console.log("onQuery", body);
	const {requestId} = body;
	const payload = {
		devices: {},
	};
	const queryPromises = [];
	const intent = body.inputs[0];
	//	 console.log(intent.payload)
	for (const device of intent.payload.devices) {
		const deviceId = device.id;
		queryPromises.push(loggedIn.query(headers.loggedInUser, deviceId)
		.then((data) => {
			// Add response to device payload
				payload.devices[deviceId] = data;
			}
		));
	}
	//Wait for all promises to resolve
	await Promise.all(queryPromises);
	return {
		requestId: requestId,
		payload: payload,
	};
});

app.onExecute(async (body,headers) => {
	//	console.log("onExecute", body);
	const {requestId} = body;
	// Execution results are grouped by status
	const result = {
		ids: [],
		status: 'SUCCESS',
		states: {
			online: true,
		},
	};

	const executePromises = [];
	const intent = body.inputs[0];
	for (const command of intent.payload.commands) {
		for (const device of command.devices) {
			for (const execution of command.execution) {
				executePromises.push(
					loggedIn.execute(headers.loggedInUser,device.id,execution)
					.then((data) => {
						result.ids.push(device.id);
						Object.assign(result.states, data);
					})
					.catch(() => console.error(`Unable to update ${device.id}`))
				);
			}
		}
	}

	await Promise.all(executePromises);
	return {
		requestId: requestId,
		payload: {
			commands: [result],
		},
	};
});

async function requestSync(user){
	let p = new Defer();
	app.requestSync(data.getAgentId(user))
	.then(res => {
		p.resolve(res);
	})
	.catch(res => {
		console.error(res);
		p.reject(res);
	});
	return await p.promise;
}

async function reportState(user, rumoClientId, deviceId, state){
	console.log("reportState", deviceId, state);
	let devId = data.getGlobalDeviceId(user, rumoClientId, deviceId);
	const requestBody = {
		requestId: aux.makeId(64),
		agentUserId: data.getAgentId(user),
		payload: {
			devices: {
				states: {
					[devId]: state
				}
			}
		}
	};
//	console.log(JSON.stringify(requestBody,null,2))
	try{
		/*let res = */await app.reportState(requestBody);
//		console.info('Report state response:', res, res.status, res.data);

	}catch(err){
		console.error("reportState",err);
	}


}

module.exports = {
	use :(expressApp)=>{
		expressApp.post('/fulfillment', app);
	},
	requestSync : requestSync,
	reportState : reportState
};
