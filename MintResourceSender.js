
function getMintVillage() {
    let userInput = prompt("'xxx|yyy':");
    let values = { X: "", Y: "" };
    if (userInput !== null) {
        let parts = userInput.split('|');

        if (parts.length === 2) {
            values.X = parts[0].trim();
            values.Y = parts[1].trim();

            // Here, you can do whatever you want with the two parts
            console.log("X:", values.X);
            console.log("Y:", values.Y);
        } else {
            alert("Invalid format!'xxx|yyy'.");
        }
    }
    return values;
}

let mintVillage = getMintVillage()
console.log(mintVillage)
// let woodPercentage = 0.6;
// let stonePercentage = 0.5207;
// let ironPercentage = 0.4252;

let woodPercentage = 0.33655;
let stonePercentage = 0.36217;
let ironPercentage = 0.30128;

// Function to extract information from village row
function extractVillageInfo(row) {
    let cells = row.cells;
    let villageId = cells[1].querySelector('.quickedit-vn').getAttribute('data-id');

    let name = cells[1].querySelector('.quickedit-label').innerText.trim();
    let coordsMatch = name.match(/\((\d+)\|(\d+)\)/);
    let coords = (coordsMatch && coordsMatch.length === 3) ? coordsMatch[1] + '|' + coordsMatch[2] : 'ERR';
    let coordX = (coordsMatch && coordsMatch.length === 3) ? coordsMatch[1] : 'ERR';
    let coordY = (coordsMatch && coordsMatch.length === 3) ? coordsMatch[2] : 'ERR';

    let resources = cells[3].querySelectorAll('.res, .warn_90, .warn');
    let wood = '';
    let stone = '';
    let iron = '';

    // Extract resource values from either '.res' or '.warn_90' elements
    if (resources.length >= 3) {
        resources.forEach(function (resource, index) {
            let text = resource.innerText.trim().replace(/\s/g, '');
            if (index === 0) {
                wood = text.replace('.', '');
            } else if (index === 1) {
                stone = text.replace('.', '');
            } else if (index === 2) {
                iron = text.replace('.', '');
            }
        });
    }

    let warehouse = cells[4].innerText.trim();
    let merchants = cells[5].querySelector('a').innerText.trim();
    let availableMerchants = merchants.split("/")[0];

    return {
        id: parseInt(villageId),
        name: name,
        coords: coords,
        X: parseInt(coordX),
        Y: parseInt(coordY),
        wood: parseInt(wood),
        stone: parseInt(stone),
        iron: parseInt(iron),
        warehouse: parseInt(warehouse),
        merchants: parseInt(availableMerchants)
    };
}


// Get the production table body
let productionTableBody = document.querySelector('#production_table tbody');

// Get all village rows
let rows = productionTableBody.querySelectorAll('tr');

// Loop through each row and extract village information
let villages = [];
rows.forEach(function (row) {
    let villageInfo = extractVillageInfo(row);
    villages.push(villageInfo);
    console.log(villageInfo)
});

// find all information about mintVillage
mintVillage = villages.find(function (village) {
    return parseInt(village.X) == parseInt(mintVillage.X) && parseInt(village.Y) == parseInt(mintVillage.Y);
});

// get distance from mintVillage
villages.forEach(function (village) {
    return getDistance(mintVillage, village);
});

// Sort villages by distance in decreasing order
villages.sort(function (a, b) {
    return b.distance - a.distance; // Sort in decreasing order
});

console.log("mint village:", mintVillage)

// Create table that will hold mintResourceSender information
function createTable() {
    let table = document.createElement('table');
    table.setAttribute('id', 'resourceSender'); // Set the id attribute for the table
    let tableContainer = document.getElementById('header_info'); // Assuming there's a container element with id 'resourceSenderContainer'

    table.innerHTML = `
        <thead>
            <tr>
                <th>Destination</th>
                <th>Source</th>
                <th>Nearest Village</th>
                <th>Resources</th>
            </tr>
        </thead>
        <tbody id="resourceSenderBody"></tbody>
    `;

    tableContainer.appendChild(table);
}

let preventOverflow = 10000;
function maxFlow(source, mintVillage, villages) {

    // Initialize variables to store the nearest village and its distance
    let maxFlowVillage = null;
    let maxFlowAmount = { wood: 0, stone: 0, iron: 0 };

    // Loop through all villages
    villages.forEach(function (destination) {
        let distanceBetweenVillages = getDistance(source, destination);

        // Check if the current village is closer
        if (destination.distance < source.distance &&
            // new path needs to be shorter then the direct (straight to mint)
            (destination.distance + distanceBetweenVillages < source.destination) &&
            source.id != destination.id
        ) {
            // Calculate resource amounts (shinko)
            let amount = calculateResAmounts(source.wood, source.stone, source.iron, 0, source.merchants);

            // Calculate the maximum amount of resources that can be sent to this village without overflowing its warehouse
            let availableWood = Math.min(amount.wood, destination.warehouse - preventOverflow - destination.wood);
            let availableStone = Math.min(amount.stone, destination.warehouse - preventOverflow - destination.stone);
            let availableIron = Math.min(amount.iron, destination.warehouse - preventOverflow - destination.iron);

            // Calculate the total available resources that can be sent to this village
            let totalAvailableResources = availableWood + availableStone + availableIron;

            // Update maxFlowVillage if the current village allows for more resources to be sent
            if (totalAvailableResources > maxFlowAmount.wood + maxFlowAmount.stone + maxFlowAmount.iron) {
                maxFlowVillage = destination;
                maxFlowAmount = {
                    wood: availableWood,
                    stone: availableStone,
                    iron: availableIron
                };
            }
        }
    });

    if (maxFlowVillage) {
        // Update the resources of the maxFlowVillage globally
        maxFlowVillage.wood += maxFlowAmount.wood;
        maxFlowVillage.stone += maxFlowAmount.stone;
        maxFlowVillage.iron += maxFlowAmount.iron;
    }

    return { village: maxFlowVillage, amount: maxFlowAmount };
}


function getDistance(source, destination) {
    destination.distance = Math.sqrt(Math.pow((source.X - destination.X), 2) + Math.pow((source.Y - destination.Y), 2));
    return destination;
}


function sendPlease(targetId, originId, wood, stone, iron) {

    var form = {
        "target_id": targetId,
        "wood": wood,
        "stone": stone,
        "iron": iron
    }

    TribalWars.post("market", {
        "ajaxaction": "map_send",
        "village": originId
    }, form, function (data) {
        console.log(data)
    }, false);
}

// Define the sendResource function - joinked from Shinko
function sendResource(villageId, targetId, amount, dialogId) {
    console.log("SEND RES", villageId, targetId, amount, dialogId)
    // Set a loading flag to true temporarily
    $('#loading').prop('visible', true);

    // Set a timeout to remove loading flag after 200 milliseconds
    setTimeout(function () {
        $('#' + dialogId)[0].remove(); // Remove a dialog element by ID
        $('#loading').prop('visible', false); // Set loading flag to false
        $('#bottom')[3].scrollIntoView(); // Scroll to the bottom of the page

        // Check if there are less than or equal to 2 elements with class '.resource_icon'
        if ($('.resource_icon').length <= 2) {
            alert('Not enough resources to send!'); // Show an alert
            // If there are elements with class '.required' greater than 0, remove them
            if ($('.required').length > 0) $('.required').remove();
            throw Error('Insufficient resources'); // Throw an error
        }
    }, 200);

    // Create an object with resource details
    var resources = {
        'target_id': targetId,
        'wood': amount.wood,
        'stone': amount.stone,
        'iron': amount.iron
    };

    // Make a POST request to TribalWars API
    TribalWars.post('/game.php?village=' + villageId, {
        'ajaxaction': 'resources_send',
        'village': villageId
    }, resources, function (response) {
        Dialog.close(); // Close a dialog
        UI.SuccessMessage(response.message); // Show a success message
        console.log(response.message); // Log the response message

        // // Update total sent resource amounts
        // totalWoodSent += woodAmount;
        // totalStoneSent += stoneAmount;
        // totalIronSent += ironAmount;

        // // Update displayed total sent resource amounts
        // $('.wood_sent').eq(0).text('' + numberWithCommas(totalWoodSent));
        // $('.stone_sent').eq(0).text('' + numberWithCommas(totalStoneSent));
        // $('.iron_sent').eq(0).text('' + numberWithCommas(totalIronSent));
    }, false); // Perform the request asynchronously
}

function calculateResAmounts(totalWood, totalStone, totalIron, resLimit, merchants) {

    // Calculate total resources to send based on merchant capacity
    let totalResourcesToSend = merchants * 1000;

    // Calculate the amount of resources to leave behind
    let leaveBehindRes = Math.floor(totalIron / 100 * resLimit);

    // Calculate the amount of resources to send for each type
    let woodToSend = totalWood - leaveBehindRes;
    let stoneToSend = totalStone - leaveBehindRes;
    let ironToSend = totalIron - leaveBehindRes;

    // Ensure negative values are set to 0
    woodToSend = Math.max(0, woodToSend);
    stoneToSend = Math.max(0, stoneToSend);
    ironToSend = Math.max(0, ironToSend);

    // Calculate the amount of resources to send with merchants
    let merchantWood = totalResourcesToSend * woodPercentage;
    let merchantStone = totalResourcesToSend * stonePercentage;
    let merchantIron = totalResourcesToSend * ironPercentage;

    // Adjust resources to send if merchant capacity is exceeded
    let scaleFactor = 1;
    if (merchantWood > woodToSend) {
        scaleFactor = woodToSend / merchantWood;
        merchantWood *= scaleFactor;
        merchantStone *= scaleFactor;
        merchantIron *= scaleFactor;
    }
    if (merchantStone > stoneToSend) {
        scaleFactor = stoneToSend / merchantStone;
        merchantWood *= scaleFactor;
        merchantStone *= scaleFactor;
        merchantIron *= scaleFactor;
    }
    if (merchantIron > ironToSend) {
        scaleFactor = ironToSend / merchantIron;
        merchantWood *= scaleFactor;
        merchantStone *= scaleFactor;
        merchantIron *= scaleFactor;
    }

    // Prepare the village data object with calculated resource amounts
    let villageData = {
        wood: Math.floor(merchantWood),
        stone: Math.floor(merchantStone),
        iron: Math.floor(merchantIron)
    };

    // Return the village data object
    return villageData;
}


function sendToNearest(source, mintVillage, villages) {

    // Calculate resource amounts (shinko)
    // let amount = calculateResAmounts(source.wood, source.stone, source.iron, 0, source.merchants);

    //return { village: maxFlowVillage, amount: maxFlowAmount };
    let maxFlowInformation = maxFlow(source, mintVillage, villages);
    let sendToVillage = maxFlowInformation.village;
    let amount = maxFlowInformation.amount;

    if (sendToVillage == null) {
        console.log("No nearest village found");
        // Use default
        sendToVillage = mintVillage;
    }

    console.log("Sending to village:", sendToVillage);
    console.log("amount", amount);

    // Create HTML row for sending
    let row = document.createElement('tr');
    row.innerHTML = `
        <td>${mintVillage.name}</td>
        <td>${source.name}</td>
        <td>${sendToVillage.name}</td>
        <td>Wood: ${amount.wood}, Stone: ${amount.stone}, Iron: ${amount.iron}</td>
        <td><button onclick="sendPlease(${sendToVillage.id}, ${source.id}, ${amount.wood}, ${amount.stone}, ${amount.iron})">Send</button></td>
    `;


    // <td><button onclick="sendResource('${source.id}', '${sendToVillage.id}', ${JSON.stringify(amount)}, 'dialog_${source.id}_${sendToVillage.id}')">Send</button></td>

    // Append row to table body
    let tableBody = document.getElementById('resourceSenderBody');
    tableBody.appendChild(row);
}

createTable();

villages.forEach(function (village) {
    if (village.X != mintVillage.X || village.Y != mintVillage.Y) {
        sendToNearest(village, mintVillage, villages);
    }
});





