var torIPList = new Array;
var ws = new WebSocket('wss://ws.blockchain.info/inv');
var NOT_FOUND = "No record found for this IP";
var EXCHANGE_RATE;

var markerIndex = -1;
var session_tx_value = 0;
var tor_tx_value = 0;

// Take in relayed_by IP from transaction, and see if it is a Tor node
function isTorIP (transaction) {
    var relayed_by_ip = transaction.x.relayed_by;
    return ($.inArray(relayed_by_ip, torIPList) !== -1);
}

// Returns the IP's country of origin
function getLocation (transaction, callback) {
    var relayed_by_ip = transaction.x.relayed_by;
    var query = "http://geoip.nekudo.com/api/" + relayed_by_ip;
    $.getJSON(query)
    .done(function (data) {
        if (data.type !== "error" && data.country !== false)
            callback(data.city, data.location.longitude, data.location.latitude);
        else
            callback(NOT_FOUND);
    })
    .fail(function (err) {
        console.log("Error getting JSON feed: " + err);
    });
} 

// Returns output value of transaction
function getValue (transaction) {
    var sum = 0;
    $.each(transaction.x.out, function (i, v) {
        sum += v.value;
    });

    // Convert satoshi to bitcoin
    return sum / 100000000;
}

// Highlights tor exit nodes
function highlightTorMarkers () {
    var map = $("#map").vectorMap("get", "mapObject");
    // turn the markers a different color
}

// Subscribe to blockchain websocket
ws.onopen = function (e) {
    ws.send('{"op":"unconfirmed_sub"}');
}

ws.onmessage = function (e) {
    var transaction = JSON.parse(e.data);
    var value = getValue(transaction);

    // Current outgoing transactions during session
    session_tx_value = session_tx_value + value
    var usd = (session_tx_value * EXCHANGE_RATE).toFixed(2);
    $("#total").text("Total outgoing BTC during session: " + session_tx_value.toFixed(8)+" ($"+usd+")");

    // Adds marker on map for each valid location.
    getLocation(transaction, function (location, longitude, latitude) {
        if (location !== NOT_FOUND) {
            markerIndex = markerIndex + 1;
            var map = $("#map").vectorMap("get", "mapObject");
            if (isTorIP(transaction)) {
                tor_tx_value = tor_tx_value + value;
                var tor_usd = (tor_tx_value * EXCHANGE_RATE).toFixed(2);
                $("#tor_total").text("Tor transaction total: " + tor_tx_value.toFixed(8) + " ($" + tor_usd + ")");
                map.addMarker(markerIndex, { latLng: [latitude, longitude], name: location, style: { fill: '#FFFF00' } });
            } else {
                map.addMarker(markerIndex, { latLng: [latitude, longitude], name: location, style: { fill: '#FF0000' } });
            }
        }
    });
}

$(document).ready(function () {
    // Populate torIPList
    var textFile = new XMLHttpRequest();
    textFile.open("GET", "https://raw.githubusercontent.com/cklegrae/Bitcoin-Statistics/master/exit_node_list.txt", false);
    textFile.onreadystatechange = function () {
        if (textFile.readyState === 4) {
            if (textFile.status === 200) {
                allText = textFile.responseText;
                $.each(textFile.responseText.split("\n"), function (i, val) {
                    torIPList.push(val);
                });
            }
        }
    }
    textFile.send(null);

    if ($("#tor-filter").is(":checked")) 
        highlightTorMarkers();

    // Get current USD exchange rate
    $.getJSON("https://blockchain.info/ticker", function (data) {
        EXCHANGE_RATE = data.USD.last;
    });
})