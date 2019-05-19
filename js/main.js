
var bc = new BroadcastChannel('contract');
var threshold = 0.5;

var contract = {
    contract_name: "Platzhalter",
    schrauben: -1,
    duebel: -1,
    delivered_schrauben: 0,
    delivered_duebel: 0,
    fulfilled: true,
    reward_schrauben: 12,
    reward_duebel: 10,
    uuid: ""
};


$(document).ready(function () {
    var x_res = 640;
    var y_res = 480;
    var snack = document.getElementById("snackbar");
    document.getElementById('drawings').setAttribute("width",x_res);
    document.getElementById('drawings').setAttribute("height",y_res);

    //disable button at the beginning
    var finished = document.getElementById("finished");
    finished.disabled = true;
    finished.style.filter = 'grayscale(100%)';
    
    //for mobilnet
    var x_scaling_factor = x_res / 300;
    var y_scaling_factor = y_res / 300;
    
    Webcam.set({
        width: x_res,
        height: y_res,
        image_format: 'png',
        jpeg_quality: 90
    });
    Webcam.attach('#my_camera');
    var detecting = true;
    
    var c = document.getElementById("drawings");
    var ctx = c.getContext("2d");

    // flip picture
    //https://christianheilmann.com/2013/07/19/flipping-the-image-when-accessing-the-laptop-camera-with-getusermedia/ 
    // ctx is the plotting canvas' context
    // w is the width of the canvas
    ctx.save()
    flip_scale();

    colorMap = {
        "Schraube": "#FF0000",
        "Duebel": "#FFFFFF",
        "Montiert": "#0000FF"
    };
    

    function drawRect(x, y, width, height, label, score) {

        
        // draw rect
        ctx.beginPath();
        if (colorMap[label] == null) {
            ctx.strokeStyle = "#FF0000";
            ctx.fillStyle = "#FF0000";
        }
        else {
            ctx.strokeStyle = colorMap[label];
            ctx.fillStyle = colorMap[label];
        }
        
        // limit width and height by screen size
        if (x+width>= x_res){
            width = x_res - x;
        }
        if (y+height>= y_res){
            height = y_res - y;
        }
        
        ctx.lineWidth = 5;
        ctx.rect(x, y, width, height);
        ctx.stroke();
        
        // draw text
        ctx.font = "20px Arial";

        // restore canvas as we want to draw text and prevent the text from being displayed flipped
        ctx.restore()
        ctx.save()

        if (colorMap[label] == null) {
            ctx.fillStyle = "#FF0000";
        }
        else {
            ctx.fillStyle = colorMap[label];
        }

        if (label=="Duebel"){label="Dübel"};
        // draw text
        ctx.font = "20px Arial";
        ctx.fillText(label + " - " + String(Number(score * 100).toFixed(0)) + '%', x_res-(x+width), y_res-(y+height) - 10);

        //reset our scaling
        flip_scale();
    }

    function flip_scale(){
        ctx.translate(x_res, y_res);
        ctx.scale(-1, -1);
    }
    
    function clearRect() {
        // clear canvas
        ctx.beginPath();
        ctx.clearRect(-100, -100, 1920, 1080);
    }
    if (detecting){
        setTimeout(take_snapshot, 3000);
    }
    else{
        setInterval(take_snapshot,3000);
    }
    var previous = {size:1};
    function take_snapshot() {
        // take snapshot and get image data
        if (!detecting) {
            // send mockup data
            data = [
                [2, 2],
                [
                    [100, 100, 300, 300, 'Schraube', '0.91'], 
                    [340, 340, 400, 400, 'Duebel', '0.95'], 
                    [100, 100, 300, 300, 'Schraube', '0.91'], 
                ]
            ];
            clearRect();
            console.log("mock data sent");
            update_contract(data[0]);
            //post message with picture and threshold
            data[1].forEach(arr => {
                drawRect(arr[0], arr[1], arr[2] - arr[0], arr[3] - arr[1], arr[4], arr[5]);
            });
            return;
        }
        
        //only do smth if picture changed
        
        Webcam.snap(function (data_uri) {
            // display results in page
            var base64ImageContent = data_uri.replace(/^data:image\/(png|jpg);base64,/, "");
            var blob = base64ToBlob(base64ImageContent, 'image/png');
            //console.log(blob.size);
            //console.log(previous.size);
            //console.log(Math.abs(blob.size-previous.size)/blob.size);
            
            //check for significant change
            // if (Math.abs(blob.size-previous.size)/blob.size >= 0.001){
            
            console.log("taking snapshot");
            var formData = new FormData();
            formData.append('file', blob);
            
            formData.append('text',threshold);
            $.ajax({
                type: "POST",
                url: "http://192.168.0.2:5000/",
                data: formData,
                contentType: false,
                processData: false,
                crossDomain: true,
                success: function (data) {
                    console.log("success");
                    clearRect();
                    //console.log(data);
                    update_contract(data[0]);
                    console.log(data)
                    data[1].forEach(arr => {
                        //console.log(arr);
                        
                        var x_begin = arr[0] ;
                        var x_end = arr[2] ;
                        var y_begin = arr[1] ;
                        var y_end = arr[3];
                        
                        drawRect(x_begin, y_begin, x_end-x_begin, y_end-y_begin, arr[4], arr[5]);
                    });
                    setTimeout(take_snapshot, 0);
                },
                error: function (data) {
                    console.log("error");
                    console.log(data);
                    setTimeout(take_snapshot, 0);
                }
            });
            // }
            //previous = blob;
            
        });
    }
    
    function base64ToBlob(base64, mime) {
        mime = mime || '';
        var sliceSize = 1024;
        var byteChars = window.atob(base64);
        var byteArrays = [];
        
        for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
            var slice = byteChars.slice(offset, offset + sliceSize);
            
            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            
            var byteArray = new Uint8Array(byteNumbers);
            
            byteArrays.push(byteArray);
        }
        
        return new Blob(byteArrays, {
            type: mime
        });
    }
    
    var slider = document.getElementById("myRange");
    $("#slider_threshold_text").html(threshold *100);
    // Update the current slider value (each time you drag the slider handle)
    slider.oninput = function() {
        threshold = this.value * 0.01;
        $("#slider_threshold_text").html(Math.round(this.value *100)/100);
    }
    
    var new_contract_button = document.getElementById("new_contract");
    new_contract_button.onclick = async function () {
        /**
         * handle the new contract plus button
         * 
         */

        //if there already was a contract before, cancel
        if (contract.fulfilled == false){
            display_toast(snack, "Alter Smart Contract wird abgebrochen...");
            await cancel_contract();
            display_toast(snack, contract.uuid + " Erfolgreich abgebrochen");
            set_contract_color("red");
            await cancel_contract();
        }

        //display a notification
        display_toast(snack, "Neuer Smart Contract wird erstellt...");

        contract.contract_name = get_random_name();

        //create a contract
        await create_contract();
       
        // enable button
        //finished.disabled = false;
        //finished.style.filter = '';

        // paint worker view
        $('#werker_ansicht').css('filter','');
        $('#werker_ansicht').css('color','white');

        //display data
        display_initial_contract()

        //display a notification
        display_toast(snack, "Smart Contract " + contract.contract_name +" erfolgreich in Blockchain erstellt");
    
    }

    //finished button control, display a message that the contract was successfully saved to the blockchain
    finished.onclick = async function (){
        //catch case if no contract yet created
        if (contract.contract_name == "Platzhalter"){
            //display a notification
            display_toast(snack, "Bitte zuerst einen neuen Smart Contract erstellen (via Plus Button)");

        }
        else{

            //disable button
            finished.disabled = true;
            finished.style.filter = 'grayscale(100%)';

            //set finished property in contract object
            contract.fulfilled = true;

            // finished message
            display_toast(snack, "Smart Contract "+ contract.contract_name  + " abgeschlossen, schreibe Einträge in Blockchain...");
            
            // set contract into waiting status
            set_contract_color("yellow");

            //here write into blockchain
            function wait_around() {
                return new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, 4000);
                });
            }
            await wait_around();
            
            // finished message
            display_toast(snack, "Eintrag wurde in die Blockchain geschrieben");
            
            set_contract_color("#00FF00");



            //paint the worker view
            $('#werker_ansicht').css('filter','grayscale(100%)');
            $('#werker_ansicht').css('color','gray');

            //enable button
            //finished.disabled = false;
            //finished.style.filter = '';
        }
    }

});

function display_toast(snack, text, length=3000) {
    /**
     * display the toast message at the bottom of the screen, requires the html object and text
     * 
     * */    
    snack.innerHTML = text;
    // Add the "show" class to DIV
    snack.className = "show";
    // After 3 seconds, remove the show class from DIV
    setTimeout(function(){ snack.className = snack.className.replace("show", ""); }, length);
}


function set_contract_color(color) {
    $("#dataRow").css("color", color);
    $("#contractName").css("color", color);
    //$("#dataRow").css("font-weight", "bold");
}

function cancel_contract(){
    return new Promise((resolve => {
        setTimeout(() => {
            resolve();
          }, 3000);
    }));

}

/*

var contracts = {};
var timeLeft = 120;
var locked = false;
var selectedContract = 0;
var settings = {
    "async": true,
    "crossDomain": true,
    "url": "http://localhost:5001",
    "method": "GET",
    "headers": {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "cache-control": "no-cache"
    },
    "data": ""
}

$.ajax(settings).done(function (response) {
    contracts = response;
    setContract(selectedContract);
});
*/
function create_contract() {
    
    $("#contractName").html(contract.contract_name);
    
    //set contract values
    contract.schrauben = Math.round((Math.random()) * 2 + 1);
    contract.duebel = contract.schrauben;

    contract.delivered_schrauben= 0;
    contract.delivered_duebel= 0;
    contract.fulfilled= false;

    //wait some time, this is a placeholder for the post to the blockchain
    return new Promise((resolve => {
        setTimeout(() => {
            resolve();
          }, 4000);
    }));
}

function display_initial_contract(){
        //worker fields
        $("#schrauben").html(contract.schrauben);
        $("#duebel").html(contract.duebel);
    
        // blockchain fields
        $("#contract_schrauben").html(contract.schrauben);
        $("#contract_duebel").html(contract.duebel);
    
        update_display(0,contract.delivered_schrauben);
        update_display(1,contract.delivered_duebel);
        
        //generate unique uuid
        contract.uuid = Math.random().toString(36).substr(2, 9);
        $('#contract_uuid').html(contract.uuid);
        
        //set rewards
        ['reward_schrauben', 'reward_duebel'].forEach(function(element){
            contract[element] = Math.floor(Math.random()*20 +1);
            $("#"+element).html(contract[element]);
        })
    
        //set color
        set_contract_color("white");
}

function update_contract(data){
    /**
     * updates the contract object and draws changes
     */

    contract.delivered_schrauben = data[0];
    //update the display (0 stands for the first row = schrauben)
    update_display(0,data[0]);

    contract.delivered_duebel = data[1];
    //update the display (0 stands for the first row = schrauben)
    update_display(1,data[1]);

    // if correct number of screws and pegs detected and not yet fulfilled
    if (data[0] ==  contract.schrauben && data[1] == contract.duebel && !contract.fulfilled){
        // enable button
        finished.disabled = false;
        finished.style.filter = '';
    }
    
}

function update_display(row_number, number){
    /**
     * updates the displayed variables in the worker view.
     * If the contract is fulfilled, the asset symbol is swapped to green. 
     * Else it is autoswapped to red.
     */
    switch (row_number){
        case 0:
            $("#schrauben_delivered").html(number);
            if (number === contract.schrauben){
                $("#schrauben_delivered").css("color", "#00FF00");
                $("#img-1").attr("src", "assets/check2.png");
            }
            else{
                $("#img-1").attr("src", "assets/cross.png");
                $("#schrauben_delivered").css("color", "white");
            }
            break;
        case 1:
            $("#duebel_delivered").html(number);
            if (number === contract.duebel){
                $("#duebel_delivered").css("color", "#00FF00");
                $("#img-2").attr("src", "assets/check2.png");
            }
            else{
                $("#img-2").attr("src", "assets/cross.png");
                $("#duebel_delivered").css("color", "white");
            }
            break;
    }
}

function get_random_name(){
    /**
     * returnsa random contract name
     */

    var companies = ["FIR", "E.Go","DFA", "WZL"];

    var random_company_id = Math.round(Math.random()* (companies.length - 1));
    var random_company = companies[random_company_id];
    companies.splice(random_company_id,1);
    return result = random_company + " -> " + companies[Math.round(Math.random() * (companies.length - 1))];
}

/*
function setCount(id, count) {
    $("#count-" + id).html(count);
}


//disabled for now
// setInterval(setTime, 1000);
function setTime() {
    if (locked)
    return;
    if (timeLeft <= 0) {
        $("#timeRemaining").html("Die Zeit ist abgelaufen");
        $("#timeRemaining").css("color", "red");
    } else {
        timeLeft--;
        $("#timeRemaining").html("Zeit bis Ablauf " + timeLeft + " Sekunden");
        $("#timeRemaining").css("color", "white");
    }
}

document.onkeydown = function (e) {
    switch (e.keyCode) {
        case 78: // n
        nextContract();
        break;
    }
};


var bc = new BroadcastChannel('contract');
var contract = {}
bc.onmessage = function (msg) {
    if (msg.data.length >= 2) { // data from webcam
        $("#01").html(msg.data[0]);
        $("#11").html(msg.data[1]);
        if (Object.keys(contract).length === 0 && contract.constructor === Object) {
            return;
        }
        if (msg.data[0] == contract["data"][0]["required_number"]) {
            $("#img-1").attr("src", "assets/check2.png");
        } else {
            $("#img-1").attr("src", "assets/cross.png");
        }
        if (msg.data[1] == contract["data"][1]["required_number"]) {
            $("#img-2").attr("src", "assets/check2.png");
        } else {
            $("#img-2").attr("src", "assets/cross.png");
        }
    } else { //new contract
        contract = msg.data;
        $("#contractName").html(contract["contract"]);
        $("#00").html(contract["data"][0]["required_number"]);
        $("#10").html(contract["data"][1]["required_number"]);
    }
}

document.onkeydown = function (e) {
    switch (e.keyCode) {
        case 78: // n
        bc.postMessage("nextContract");
        break;
    }
};

*/
