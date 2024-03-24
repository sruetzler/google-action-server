let zaehler = 0;
let json;
let auswahl = -1;
var myAddModal;
var myEditModal;
var currentPage;

function swClick() {
    // Objekt der Klasse XMLHttpRequest erstellen
    let xhr = new XMLHttpRequest();

    // Request-Methodenkopf auf PUT setzen
    xhr.open("PUT", "/fridge/swClick", true);

    // Request-Ressourcen-Pfad setzen
    xhr.setRequestHeader("Content-Type", "text/plain");

    // Request-Inhalt setzen
    const status = document.getElementById("flexSwitchCheckDefault").checked;
    if(status === true){
        xhr.send(true);
    }else{
        xhr.send(false);
    }
    

    console.log("Der Switch wurde gedrückt")
}

function allesLaden() {
    currentPage = window.location.pathname; // Gibt den Dateinamen der geladenen Seite zurück
    console.log("Die aktuelle Seite ist: " + currentPage);
    parseJSON();
    
    if (currentPage === "/fridge/settings/") {
        return
    }

    console.log("Die Seite wurde geladen :)")
    myAddModal = new bootstrap.Modal(document.getElementById('addModal'));
    myEditModal = new bootstrap.Modal(document.getElementById('bearbeitenModal'));
    
    
   
}

function speichern(){


    const name = document.getElementById("floatingName");
    const datum = document.getElementById("floatingDatum");
    const uhrzeit = document.getElementById("floatingUhrzeit");
    const stunden = document.getElementById("floatingStunden");
    const code = document.getElementById("floatingCode");

    if (name.value == "" || datum.value == "" || uhrzeit.value == "" || stunden.value == "" || code.value == "") {
        console.log("Es ist nichts drin!!");
        alert("Bitte füllen Sie alle Felder aus");
        return;
    }

    
    
    myAddModal.hide();

    // console.log(name);
    // console.log(datum);
    // console.log(uhrzeit);
    // console.log(stunden);
    // console.log(code);

   

    const daten = {
        Name: String(name.value),
        Datum: String(datum.value),
        Uhrzeit: String(uhrzeit.value),
        Dauer: String(stunden.value),
        Code: String(code.value)
      };
      
    

    console.log(JSON.stringify(daten));

    const datenString = JSON.stringify(daten);


    let xhr = new XMLHttpRequest();
    xhr.open("PUT", "/fridge/neueDaten", true);

    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send(datenString);
    

    parseJSON();
}

function showPassword(id) {
    // var input = document.getElementById("floatingCodeB");
    var input = document.getElementById(id);
    input.type = input.type === "password" ? "numeric" : "password";
    // input.inputMode = "numeric";
    // input.pattern = "[0-9]+"
}

function inhaltDelete() {
    const name = document.getElementById("floatingName").value = "";
    const datum = document.getElementById("floatingDatum").value = "";
    const uhrzeit = document.getElementById("floatingUhrzeit").value = "";
    const stunden = document.getElementById("floatingStunden").value = "";
    const code = document.getElementById("floatingCode").value = "";

    
}

function parseJSON() {
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function (id) {
        if (this.readyState == 4 && this.status == 200) {
            // document.getElementById("2").innerHTML = this.responseText;
            console.log(this.responseText);

            const jsonString = this.responseText;
            json = JSON.parse(jsonString);
            console.log(json.verriegelt);
            document.getElementById("flexSwitchCheckDefault").checked = json.verriegelt;
        
            

            // JSON-String erstellen
            // const jsonString = "{'verriegelt':true,'zeiten':[{'Name':'Erik','Datum':'13.01.2024','Dauer':'3','Code':'5763'},{'Name':'Henri','Datum':'13.01.2024','Dauer':'3','Code':'5763'}]}";
            
            // JSON-Objekt aus dem JSON-String erstellen
            // const json = {"verriegelt":true,"zeiten":[{"Name":"Erik","Datum":"13.01.2024","Uhrzeit":"12:00","Dauer":"3","Code":"5763"},{"Name":"Henri","Datum":"13.01.2024","Uhrzeit":"12:00","Dauer":"3","Code":"5763"}]};
            // const json = this.responseText;
            
            // Tabellenelemente erstellen
            const tableRows = [];
            zaehler = 0;


            if (currentPage === "/fridge/") {
                for (const zeit of json.zeiten) {
                    const tableRow = document.createElement("tr");

                    const checkInput = document.createElement("td");
                    const checkbox = document.createElement("input");
                    checkbox.setAttribute("type", "checkbox");
                    checkbox.setAttribute("class", "form-check-input");
                    checkbox.setAttribute("id", "checkbox" + zaehler);
                    const i = zaehler;
                    checkbox.onclick = function(){
                        onlyOne(i);
                    }
                    // checkbox.setAttribute("onclick", onlyOne(zaehler));
                    checkInput.appendChild(checkbox);
                    tableRow.appendChild(checkInput);

                    
                    
                    const nameCell = document.createElement("th");
                    nameCell.textContent = zeit.Name;
                    tableRow.appendChild(nameCell);
                    
                    const datumCell = document.createElement("td");
                    datumCell.textContent = zeit.Datum;
                    tableRow.appendChild(datumCell);
                    
                    const uhrzeitCell = document.createElement("td");
                    uhrzeitCell.textContent = zeit.Uhrzeit;
                    tableRow.appendChild(uhrzeitCell);
                    
                    const dauerCell = document.createElement("td");
                    dauerCell.textContent = zeit.Dauer;
                    tableRow.appendChild(dauerCell);

                    tableRows.push(tableRow);
                    zaehler ++;
                }
                
                // Tabellenelemente der Tabelle hinzufügen
                const table = document.getElementById("table");
                while (table.firstChild) {
                    table.removeChild(table.firstChild);
                }
                
                for (const tableRow of tableRows) {
                    table.appendChild(tableRow);
                }
            }
        }
    };
    xhttp.open("GET", "/fridge/statusSwitch", true);
    xhttp.send();
}

function onlyOne(id) {
    auswahl = id;
    for (let index = 0; index < zaehler; index++) {
        if(index != id){
            document.getElementById("checkbox" + index).checked = false;
        }

        
    }
    
}

function bBearbeitenC(){
    auswahl = -1;

    for (let index = 0; index < zaehler; index++) {

        if (document.getElementById("checkbox" + index).checked == true) {
            auswahl = index;
        }
    }

    
    if (auswahl == -1) {
        alert("Bitte wählen Sie zuerst ein Element aus");
        // alert("Es wurde nichts ausgewählt", "Error");
        return;
    }

    
    myEditModal.show();

    eintrag = json.zeiten[auswahl];

    const name = document.getElementById("floatingNameB");
    const datum = document.getElementById("floatingDatumB");
    const uhrzeit = document.getElementById("floatingUhrzeitB");
    const stunden = document.getElementById("floatingStundenB");
    const code = document.getElementById("floatingCodeB");



    name.value = eintrag.Name;
    datum.value = eintrag.Datum;
    uhrzeit.value = eintrag.Uhrzeit;
    stunden.value = eintrag.Dauer;
    code.value = eintrag.Code;
    
}

function bearbeitenSp() {
    const name = document.getElementById("floatingNameB");
    const datum = document.getElementById("floatingDatumB");
    const uhrzeit = document.getElementById("floatingUhrzeitB");
    const stunden = document.getElementById("floatingStundenB");
    const code = document.getElementById("floatingCodeB");

    if (name.value == "" || datum.value == "" || uhrzeit.value == "" || stunden.value == "" || code.value == "") {
        console.log("Es ist nichts drin!!");
        alert("Bitte füllen Sie alle Felder aus");
        return;
    }

    const daten = {
        id: auswahl,
        Name: String(name.value),
        Datum: String(datum.value),
        Uhrzeit: String(uhrzeit.value),
        Dauer: String(stunden.value),
        Code: String(code.value)
      };
    
    console.log(JSON.stringify(daten));

    const datenString = JSON.stringify(daten);


    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/fridge/datenAktualisieren", true);

    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send(datenString);

    myEditModal.hide();

    parseJSON();

}
function bearbeitenDe() {

    const daten = {
        id: auswahl
    };

    const datenString = JSON.stringify(daten);
    let xhr = new XMLHttpRequest();
    xhr.open("DELETE", "/fridge/datenDelete", true);

    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send(datenString);

    parseJSON();
}


function validatePasswords(){
    var validatepassword = false;
    const mainPassword = document.getElementById("inputAkutellesPassword").value;
    const password1 = document.getElementById("inputNeuesPassword").value;
    const password2 = document.getElementById("inputNeuesPasswordAgain").value;

    const mainPasswordInput = document.getElementById("inputAkutellesPassword");
    const password1Input = document.getElementById("inputNeuesPassword");
    const password2Input = document.getElementById("inputNeuesPasswordAgain");


    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function (id) {
        if (this.readyState == 4 && this.status == 200) {
            // console.log(this.responseText);
            if (this.responseText ===  '"' + mainPassword + '"') {
                console.log("Es ist richtig!!!");
                mainPasswordInput.classList.remove("is-invalid");
                mainPasswordInput.setCustomValidity('');
                validatepassword = true;
            }else{
                console.log("Es ist nicht richtig!!!");
                mainPasswordInput.classList.add("is-invalid");
                mainPasswordInput.setCustomValidity("Passwords Don't Match");
                validatepassword = false;
            }
        }
        
        
        
        
        
        
        
        // if (password1 === password2 && validatepassword) {
        //     console.log("!!!!!!!!1Aufgerufen!!!!!!!!!!!");
        //     let xhr = new XMLHttpRequest();
        //     xhr.open("PUT", "/fridge/changePassword", true);
            
        //     xhr.setRequestHeader("Content-Type", "application/json");
            
        //     xhr.send(JSON.stringify(password1Input));
            
        //     // return true
        // }else{
        //     console.log("false")
        //     // return false
        // }
        
    }
    xhttp.open("GET", "/fridge/validatepassword", true);
    xhttp.send();


    if (password1 !== password2) {
        password1Input.classList.add("is-invalid");
        password2Input.classList.add("is-invalid");
        password1Input.setCustomValidity("Passwords Don't Match")
        password2Input.setCustomValidity("Passwords Don't Match");
    } else {
        password1Input.classList.remove("is-invalid");
        password2Input.classList.remove("is-invalid");
        password1Input.setCustomValidity('');
        password2Input.setCustomValidity('');
    }

    return (password1 === password2) === (this.responseText ===  '"' + mainPassword + '"');
}


window.addEventListener("load", allesLaden);
