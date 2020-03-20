https://developers.google.com/identity/sign-in/web/server-side-flow#step_7_exchange_the_authorization_code_for_an_access_token

https://developers.google.com/assistant/identity/google-sign-in-oauth

https://codelabs.developers.google.com/codelabs/smarthome-washer

https://developers.google.com/assistant/identity/oauth2?oauth=code

https://developers.google.com/identity/sign-in/web/sign-in

https://developers.google.com/assistant/smarthome/develop/report-state


https://certbot.eff.org/lets-encrypt/debianjessie-other

---------------------------------------------
Setup Action Console Project
https://console.actions.google.com

New Project
Enter name
Chose Language and Region: German/Germany
Create Project
Select Smart Home

Name your Smarthome action
Enter name: e.g. Rumo Smarthome
Save

back

Actions
Fulfillment URL
https://serverUri/fulfillment

Setup account linking
Next
Linking type: OAuth/Authorization code

OAuth Client Informattion
Client ID, e.g. rumoSmartHomeGoogle-xyz....
Client Secret, something
store client ID and secret in config.json

Authorization URL:  https://serverUri/auth
Token URL: https://serverUri/token

next
no scopes

next
Testing instructions
dummy

Save

Test

Store Project ID in config.json
You can found in 3 dots/Projet settings

---------------------------------------------

Not neccessary
#Create API Key
#https://cloud.google.com/console/google/maps-apis/overview

#Select Project (ALL)
#Select Bar on left open
#APIs & Services/Credentials
#Create Credentials/API Key
#Store API key in config.json

#Restrict API key:
#Name Key: Smarthome
#Restriction not yet

---------------------------------------------
Access to Google API Client Library
https://console.developers.google.com/
Select Project (ALL)
Select Credentials
Create Credentials/OAuth client ID
Applicateion type: Web Application
Name: OAuth client
Authorized JavaScript origins: add your URI

Add own URI

Create

Store Client id in config.json
and static/login.html meta/content

Ok

Configure Consent Screen
User Type: External
create
Support Email: select your email address
Authorized Domains: add your domain
Application Homepage link, Application Privacy Policy link,Application Terms of Service link : add your url
Save

-----------------------------------------------
Enable Homegraph APIs
https://console.developers.google.com/apis/api/homegraph.googleapis.com/overview
Select Project an enable api

In the GCP Console, go to the Create service account key page.
https://console.cloud.google.com/apis/credentials/serviceaccountkey
rom the Service account list, select New service account.
In the Service account name field, enter a name.
In the Service account ID field, enter a ID.

From the Role list, select Service Accounts > Service Account Token Creator.

For the Key type, select the JSON option.
Click Create. A JSON file that contains your key downloads to your computer.
Add the filename in serviceAccountKey in the config.json
