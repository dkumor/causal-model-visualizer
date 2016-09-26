var editor = CodeMirror.fromTextArea(document.getElementById("graphinput"), {
    lineNumbers: true,
    autofocus: true,
    viewportMargin: Infinity
});

var nodes = new vis.DataSet([]);

// create an array with edges
var edges = new vis.DataSet([]);

// create a network
var container = document.getElementById('mynetwork');
var data = {
    nodes: nodes,
    edges: edges
};


var visualization = new vis.Network(document.getElementById("graphvis"), data, {});


function drawGraph(data) {
    nodes = [];
    nodenames = Object.keys(data.nodes);

    for (i = 0; i < nodenames.length; i++) {
        nodes.push({
            id: nodenames[i],
            label: nodenames[i],
            color: {
                background: 'white',
                border: "black"
            }
        });
    }

    edges = [];
    for (i = 0; i < data.edges.length; i++) {
        edge = {
            from: data.edges[i][0],
            to: data.edges[i][2],
            arrows: "to",
            color: "black"
        };
        if (data.edges[i][1] == "--") {
            edge.arrows = 'to, from';
            edge.dashes = true;
            edge.length = 200;
            edge.smooth = {
                enabled: true,
                type: 'dynamic',
                roundness: 1.0
            };
        } else {
            edge.length = 100;
            edge.smooth = false;
        }
        edges.push(edge);
    }
    
    visualization.setOptions({physics: {enabled: true}});
    visualization.setData({nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges)});
    visualization.on("stabilized", function(properties) {
        visualization.setOptions({physics: {enabled: false}});
    });
}

function parseGraph() {
    txt = editor.getValue();
    /*
    $.post("/parse/", {graph: txt}).done(function(data) {
        console.log(data);
        $("#errortext").text(data.error);
        if (data.error === "") {
            // We now draw the graph
            drawGraph(data);
        }
    });
    */
    // This is a quick parser written in straight-up javascript
    var words = txt.trim().split(/\s+/g);
    var data = {
        nodes: {},
        edges: []
    };
    if (words[0] != "<NODES>") {
        $("#errortext").text("Couldn't find <NODES> tag");
        return;
    }
    var i = 1;
    while (i < words.length && words[i] != "<EDGES>") {
        data.nodes[words[i]] = true;
        i += 1;
    }
    if (words[i] == "<EDGES>") {
        i += 1;
        while (i + 2 < words.length) {
            if (words[i + 1] != "--" && words[i + 1] != "->") {
                $("#errortext").text("Unknown edge type " + words[i + 1]);
                return;
            }
            if (data.nodes[words[i]] === undefined) {
                $("#errortext").text("Unknown node " + words[i]);
                return;
            }
            if (data.nodes[words[i + 2]] === undefined) {
                $("#errortext").text("Unknown node " + words[i + 2]);
                return;
            }
            data.edges.push([
                words[i],
                words[i + 1],
                words[i + 2]
            ]);
            i += 3
        }
    }
    console.log(data);
    drawGraph(data);
}

// Run a graph parse right at the beginning
parseGraph();

function runQuery() {
    // This code is stubbed out - it was ripped from the visualizatino of a bounding algorithm
    txt = editor.getValue();
    $.post("/query/", {
        graph: txt,
        query: $("#ex2").val()
    }).done(function(data) {
        console.log(data);
        $("#errortext").text(data.error);
        if (data.error === "") {
            // We now draw the graph
            drawGraph(data);
        }
    });
}

function exportImage() {
    // First we need to get the bounding box for our graph, so that our exported image isn't too big
    var bounds = {
        top: 1000000,
        bottom: -11111111111,
        left: 100000000,
        right: -11111111111
    };
    for (var i = 0; i < nodes.length; i++) {
        let b = visualization.getBoundingBox(nodes[i].id);
        if (b.top < bounds.top) {
            bounds.top = b.top;
        }
        if (b.bottom > bounds.bottom) {
            bounds.bottom = b.bottom;
        }
        if (b.left < bounds.left) {
            bounds.left = b.left;
        }
        if (b.right > bounds.right) {
            bounds.right = b.right;
        }
    }
    // Fix the bounds
    var xy = visualization.canvasToDOM({x: bounds.left, y: bounds.top});
    bounds.left = xy.x;
    bounds.top = xy.y;
    xy = visualization.canvasToDOM({x: bounds.right, y: bounds.bottom});
    bounds.right = xy.x;
    bounds.bottom = xy.y;
    
    // Now add the padding
    bounds.left -= parseInt($("#pleft").val());
    bounds.right += parseInt($("#pright").val());
    bounds.top -= parseInt($("#ptop").val());
    bounds.bottom += parseInt($("#pbottom").val());

    bounds.width = bounds.right - bounds.left;
    bounds.height = bounds.bottom - bounds.top;

    var canvas = visualization.canvas.frame.canvas;
    var ctx = canvas.getContext('2d');
    var data = ctx.getImageData(bounds.left, bounds.top, bounds.width, bounds.height);

    var tempCanvas = document.createElement("canvas"),
        tCtx = tempCanvas.getContext("2d");
    tempCanvas.width = bounds.width;
    tempCanvas.height = bounds.height;

    tCtx.putImageData(data, 0, 0);

    var img = tempCanvas.toDataURL("image/png");
    window.open(img, '_blank');
}

function resetPadding() {
    $("#pleft").val(10);
    $("#pright").val(10);
    $("#ptop").val(10);
    $("#pbottom").val(10);
}
resetPadding();
