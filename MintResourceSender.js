
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

const mintVillage = getMintVillage()
let woodPercentage = 0.6;
let stonePercentage = 0.5207;
let ironPercentage = 0.4252;

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
        resources.forEach(function(resource, index) {
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

    return {
        id: villageId,
        name: name,
        coords: coords,
        X: coordX,
        Y: coordY,
        wood: wood,
        stone: stone,
        iron: iron,
        warehouse: warehouse,
        merchants: merchants
    };
}


// Get the production table body
let productionTableBody = document.querySelector('#production_table tbody');
// Get all village rows
let rows = productionTableBody.querySelectorAll('tr');
// Loop through each row and extract village information
let villages = [];
rows.forEach(function(row) {
    let villageInfo = extractVillageInfo(row);
    villages.push(villageInfo);
	console.log(villageInfo)
});

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


function findNearestInDirection(source, mintVillage, villages, amount) {
    // Parse the coordinates of the source and mintVillage
    let sourceX = parseInt(source.X);
    let sourceY = parseInt(source.Y);

    let mintX = parseInt(mintVillage.X);
    let mintY = parseInt(mintVillage.Y);

    // Calculate the direction vector from source to mintVillage
    let directionX = mintX - sourceX;
    let directionY = mintY - sourceY;

    // Initialize variables to store the nearest village and its distance
    let nearestVillage = null;
    let minDistance = Number.MAX_SAFE_INTEGER;

    // Loop through all villages
    villages.forEach(function(village) {
        // Parse the coordinates of the current village
        let villageX = parseInt(village.X);
        let villageY = parseInt(village.Y);

        // Calculate the vector from source to the current village
        let vectorX = villageX - sourceX;
        let vectorY = villageY - sourceY;

        // Check if the current village is in the same direction as mintVillage
        if (vectorX * directionX >= 0 && vectorY * directionY >= 0) {
            // Calculate the distance between the source and the current village
            let distance = Math.sqrt(Math.pow(vectorX, 2) + Math.pow(vectorY, 2));

            // Check if the current village is closer
            if (distance < minDistance && 
                village.wood + amount.wood < village.warehouse &&
                village.stone + amount.stone < village.warehouse &&
                village.iron + amount.iron < village.warehouse) {
                nearestVillage = village;
                minDistance = distance;
            }
        }
    });

    if (nearestVillage) {
        // Update the resources of the nearest village globally
        nearestVillage.wood += amount.wood;
        nearestVillage.stone += amount.stone;
        nearestVillage.iron += amount.iron;
    }

    return nearestVillage;
}

// Define the sendResource function
function sendResource(villageId, targetId, amount, dialogId) {
    // Set a loading flag to true temporarily
    $('#loading').prop('visible', true);

    // Set a timeout to remove loading flag after 200 milliseconds
    setTimeout(function() {
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
    }, resources, function(response) {
        Dialog.close(); // Close a dialog
        UI.SuccessMessage(response.message); // Show a success message
        console.log(response.message); // Log the response message

        // Update total sent resource amounts
        totalWoodSent += woodAmount;
        totalStoneSent += stoneAmount;
        totalIronSent += ironAmount;

        // Update displayed total sent resource amounts
        $('.wood_sent').eq(0).text('' + numberWithCommas(totalWoodSent));
        $('.stone_sent').eq(0).text('' + numberWithCommas(totalStoneSent));
        $('.iron_sent').eq(0).text('' + numberWithCommas(totalIronSent));
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


function sendToNearest(source, mintVillage, villages){
	let x = mintVillage.X; 
	let y = mintVillage.Y;
	x -= source.X;
	y -= source.Y;
	// 1coin = 28.000 30.000 25.000
	// ratio = 1.12   1.2	 1      ==  3.32

    console.log("source", source.name)
	// amount (shinko)
	amount = calculateResAmounts(source.wood, source.stone, source.iron, 0, source.merchants);
	console.log(amount)

	// Gets the nearest village that has enough warehouse & is closer
	sendToVillage = sendToNearest(source, mintVillage, villages, amount)
    console.log("send to", sendToVillage.name)

	// Create HTML row for sending
    let row = document.createElement('tr');
    row.innerHTML = `
        <td>${mintVillage.name}</td>
        <td>${source.name}</td>
		<td>${sendToVillage.name}</td>
        <td>Wood: ${wood}, Stone: ${stone}, Iron: ${iron}</td>
		<td><button onclick="sendResource('${source.id}', '${sendToVillage.id}', ${JSON.stringify(amount)}, 'dialog_${source.id}_${sendToVillage.id}')">Send</button></td>
    `;

    // Append row to table body
    let tableBody = document.getElementById('resourceSenderBody');
    tableBody.appendChild(row);
}

createTable();

villages.forEach(function(village){
	if (village.X != mintVillage.X || village.Y != mintVillage.Y) {
		sendToNearest(village, mintVillage, villages);
	}
});





