var torIPList = new Array;
var ws = new WebSocket('wss://ws.blockchain.info/inv');
var NOT_FOUND = "No record found for this IP";
var EXCHANGE_RATE;

var markerIndex = -1;
var session_tx_value = 0;
var tor_tx_value = 0;
var btcValues = [];

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
            callback(data);
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
    var bitcoinValue = getValue(transaction);

    // Current outgoing transactions during session
    session_tx_value = session_tx_value + bitcoinValue
    var usd = (session_tx_value * EXCHANGE_RATE).toFixed(2);
    $("#total").text("Total outgoing BTC during session: " + session_tx_value.toFixed(8)+" ($"+usd+")");

    // Adds marker on map for each valid location.
    getLocation(transaction, function (data) {
        if (data.city !== NOT_FOUND && data.location !== undefined) {
            // Sometimes the city can't be found, replace it with country.
            if (data.city === false)
                data.city = "Location in " + data.country.name;

            markerIndex = markerIndex + 1;
            var map = $("#map").vectorMap("get", "mapObject");

            if (isTorIP(transaction)) {
                tor_tx_value = tor_tx_value + bitcoinValue;
                var tor_usd = (tor_tx_value * EXCHANGE_RATE).toFixed(2);
                $("#tor_total").text("Tor transaction total: " + tor_tx_value.toFixed(8) + " ($" + tor_usd + ")");
                map.addMarker(markerIndex, { latLng: [data.location.latitude, data.location.longitude], name: data.city, style: { fill: '#FFFF00' }, value: bitcoinValue });
            } else {
                map.addMarker(markerIndex, { latLng: [data.location.latitude, data.location.longitude], name: data.city, style: { fill: '#FF0000' }, value: bitcoinValue });
            }

            var torPercent = (($("circle[fill='#FFFF00']").length / $("circle").length) * 100).toFixed(2);
            $("#tor_perc").text("Percentage of Tor relays: " + torPercent + "%");

            if (btcValues[data.country.code] !== undefined)
                btcValues[data.country.code] += bitcoinValue;

            map.series.regions[0].setValues(btcValues);
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

    $("#tor-filter").change(function() {
        if ($("#tor-filter").is(":checked"))
            $("circle[fill='#FFFF00']").hide();
        else
            $("circle[fill='#FFFF00'").show();
    });

    // Get current USD exchange rate
    $.getJSON("https://blockchain.info/ticker", function (data) {
        EXCHANGE_RATE = data.USD.last;
    });

    document.getElementById("map").setAttribute("style", "width:" + screen.width + "px");
    document.getElementById("map").setAttribute("style", "height:" + (screen.height - 150) + "px");
    
    $('#map').vectorMap({
        map: 'world_mill',
        markers: [],
        series: {
            regions: [{
                scale: ['#DEEBF7', '#08519C'], normalizeFunction: 'polynomial', min: '0', max: '10000'
            }]
        },
        zoomOnScroll: false,
        onRegionTipShow: function (event, tip, code) {
            tip.html(
              "<b>" + tip.html() + "</b></br>" +
              "<b> Value of transactions: </b> $" + (btcValues[code] * EXCHANGE_RATE).toFixed(2) + " (" + (btcValues[code] / session_tx_value * 100).toFixed(2) + "%)"
            );
        },
        onMarkerTipShow: function (event, tip, index) {
            var marker = map.markers[index];
            tip.html(
                "<b>" + tip.html() + "</b></br>" +
                "<b> tx value: </b>" + marker.config.value);
        }
    });

    var map = $("#map").vectorMap("get", "mapObject");

    // Create empty heatmap.
    for (key in map.regions) {
        btcValues[key] = 0;
    }

})