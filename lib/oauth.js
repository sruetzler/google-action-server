const util = require('util');
const {OAuth2Client} = require('google-auth-library');
const rumoLogin = require("./socket/login");
const {aux} = require("google-action-util");

// "clientId" : "rumoSmartHomeGoogle-3k45nf99234f090lkj34f9eldvjmnioaf",
// "clientSecret" : "J8G(#PIVO)yC(I1/7<%&zTZ$y=jFZRl8",

let data = require("./data");

const clients = {
	ABC123 : {
		clientSecret : "DEF456",
		redirect_uri : "https://oauth-redirect.googleusercontent.com/r/rumo-6f9bf",
		scope : "google"
	},
	[config.googleAction.clientId] : {
		clientSecret : config.googleAction.clientSecret,
		redirect_uri : "https://oauth-redirect.googleusercontent.com/" + config.projectId.slice(0,1) + "/" + config.projectId,
		scope : "google"
	},
	[config.rumo.clientId] : {
		clientSecret : config.rumo.clientSecret,
//		redirect_uri : "https://oauth-redirect.googleusercontent.com/" + config.projectId.slice(0,1) + "/" + config.projectId,
		scope : "rumo"
	},
	rumoSmartHomePlayground : {
		clientSecret : "DEF456",
		redirect_uri : "https://developers.google.com/oauthplayground",
		scope : "google"
	}
};

function sendError(res, error, code){
	if (!code) code = 400;
	res.status(code).json({
		error : error
	});
}

module.exports = expressApp=>{
	expressApp.get('/auth', async (req, res) => {
		console.log('auth',req.headers, req.body, req.query);

		if (!clients[req.query.client_id]){
			return sendError(res,"invalid_client");
		}
		if (req.query.redirect_uri !== clients[req.query.client_id].redirect_uri){
			return sendError(res,"invalid_redirect_uri");
		}
		if (req.query.response_type !== "code"){
			return sendError(res,"unsupported_response_type");
		}

		let responseurl = util.format('%s?code=%s&state=%s&client_id=%s',
			"/login.html", aux.makeId(128),
			req.query.state,
			req.query.client_id);

//	    console.log(responseurl);

		return res.redirect(responseurl);
	});

	expressApp.put("/login", async (req, res) => {
		console.log('login',req.headers, req.body, req.query);
		const client = new OAuth2Client(req.body.client_id);
		async function verify() {
			const ticket = await client.verifyIdToken({
				idToken: req.body.id_token,
				audience: config.keys.oAuthClientId
			});
			const payload = ticket.getPayload();
			if (!payload.email_verified){
				throw "email_not_verified";
			}
			return payload.email;
		}

		try{
			let userId = await verify();
			try{
				if (req.body.rumo_client_id) await rumoLogin.onLoggedIn(req, res, userId);
				else await onGoogleLogin(req,res,userId);
			}catch(err){}
		}catch(err){
			console.error(err);
			sendError(res,err);
		}

	});

	expressApp.all('/token', async (req, res) => {
		console.log('token',req.headers, req.body, req.query);
		const grantType = req.query.grant_type
	      ? req.query.grant_type : req.body.grant_type;
	    const seconds = 600;
	    const HTTP_STATUS_OK = 200;
//	    console.log(`Grant type ${grantType}`);

		if (!clients[req.body.client_id]){
			return sendError(res,"invalid_client");
		}
		if (clients[req.body.client_id].clientSecret !== req.body.client_secret){
			return sendError(res,"wrong_client_secret");
		}

		let endTime = (new Date()).getTime() + (seconds*1000);

	    let obj;
	    if (grantType === 'authorization_code') {
			let user =  data.getUserFromCode(req.body.code);
			if (!user){
				return sendError(res,"invalid_code");
			}
			let authCode = user.getAuthCode(req.body.code);
			obj = {
				token_type: 'bearer',
				access_token: aux.makeId(128, endTime),
				refresh_token: aux.makeId(128),
				expires_in: seconds,
			};
			await authCode.setAccessToken(obj.access_token, endTime);
			await authCode.setRefreshToken(obj.refresh_token);
	    } else if (grantType === 'refresh_token') {
			let user =  data.getUserFromRefreshToken(req.body.refresh_token);
			if (!user){
				return sendError(res,"invalid_code");
			}
			let authCode = user.getAuthCodeFromRefreshToken(req.body.refresh_token);
			obj = {
				token_type: 'bearer',
				access_token: aux.makeId(128),
				expires_in: seconds,
			};
			await authCode.setAccessToken(obj.access_token, endTime);
		}else{
			return sendError(res,"invalid_grant");
		}
		res.status(HTTP_STATUS_OK)
		.json(obj);
	});
	expressApp.use(function(req, res, next){
		let user =  req.headers && req.headers.authorization && data.checkAccessToken(req.headers.authorization.replace(/^Bearer /,""),"google");
		if (!user)	return sendError(res,"permission_denied",403);
		req.headers.loggedInUser = user.user;
		next();
	});
};

async function onGoogleLogin(req,res,userId){
	if (!clients[req.body.client_id]){
		return sendError(res,"invalid_client");
	}
	try{
		const responseurl = util.format('%s?redirect_uri=%s&code=%s&state=%s',
			"/loggedIn.html", clients[req.body.client_id].redirect_uri, req.body.code,
			req.body.state);
		await (await data.addUser(userId)).addCode(req.body.code, clients[req.body.client_id].scope);

		//			console.log(responseurl);

		res.status(200)
		.json(responseurl);
	}catch(err){
		console.error(err);
		sendError(res,err);
	}
}
