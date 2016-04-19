var torIPList = new Array;
var ws = new WebSocket('wss://ws.blockchain.info/inv');
var NOT_FOUND = "No record found for this IP";
var markerIndex = 0;

// Take in relayed_by IP from transaction, and see if it is a Tor node
function isTorIP (relayed_by_ip) {
  return ($.inArray(relayed_by_ip, torIPList) !== -1);
}

// Returns the IP's country of origin
function getLocation (relayed_by_ip, callback) {
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

// Subscribe to blockchain websocket
ws.onopen = function (e) {
  ws.send('{"op":"unconfirmed_sub"}');
}

ws.onmessage = function (e) {
    var transaction = JSON.parse(e.data);
    var relayed_by_ip = transaction.x.relayed_by;
    var value = getValue(transaction);

    // Adds marker on map for each valid location.
    getLocation(relayed_by_ip, function (location, longitude, latitude) {
        if (location !== NOT_FOUND) {
            var map = $("#map").vectorMap("get", "mapObject");
            map.addMarker(markerIndex++, { latLng: [latitude, longitude], name: location });
        }
    });

    if (isTorIP(relayed_by_ip)) {
        $("#locations").append(" TOR");
    }
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
})