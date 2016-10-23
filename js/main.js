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
    
    nodenames = Object.keys(data.nodes);
    nodelabels = nodenames.map(function(name) {return data.nodes[name]});

    renderMathForLabels(nodelabels,function(mathOut) {
        nodes = [];
        for (i = 0; i < nodenames.length; i++) {
            var node = {
                id: nodenames[i],
                color: {
                    background: 'white',
                    border: "black"
                }
            };
            if (mathOut[i].img!==undefined) {
                node.image = mathOut[i].img;
                node.shape='circularImage';
            } else {
                node.label = mathOut[i].label;
            }
            nodes.push(node);
        }

        edges = [];
        for (i = 0; i < data.edges.length; i++) {
            edge = {
                from: data.edges[i][0],
                to: data.edges[i][2],
                arrows: "to",
                color: "black",
            };
            if (data.edges[i][1] == "--") {
                edge.arrows = 'to, from';
                edge.dashes = true;
                edge.length = 200;
                edge.smooth = {
                    enabled: true,
                    type: 'curvedCW',
                    roundness: 0.5
                };
            } else {
                edge.length = 100;
                edge.smooth = false;
            }
            if (data.edges[i].length == 4) {
                edge.label = data.edges[i][3];
                edge.font = {align: 'top'};
            }
            edges.push(edge);
        }
        var options = {
            nodes: {
                shapeProperties: {
                    useBorderWithImage:true,
                    useImageSize: true
              }
            },
            edges: {
                arrows: {
                    to: {
                        scaleFactor: 0.7
                    },
                    from: {
                        scaleFactor: 0.7
                    },
                },
            },
            
            physics: {
                enabled: true,
            }
        };
        visualization.setOptions(options);
        visualization.setData({nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges)});
        
        visualization.on("stabilized", function(properties) {
            options.physics.enabled = false;
            visualization.setOptions(options);
        });
        
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
    var olines = txt.trim().split("\n")
    var lines = [];
    for (var i=0; i < olines.length; i++) {
        line = olines[i].trim();
        if (line.length > 0) {
            lines.push(line);
        }
    }
    
    var data = {
        nodes: {},
        edges: []
    };
    if (lines[0] != "<NODES>") {
        $("#errortext").text("Couldn't find <NODES> tag");
        return;
    }
    var i = 1;
    while (i < lines.length && lines[i] != "<EDGES>") {
        // Each of the edges has first its label, then optionally the string to use when showing (latex surrounded by $)
        words = lines[i].split(/\s+/g);
        data.nodes[words[0]] = words[0];
        if (words.length>1) {
            data.nodes[words[0]] = lines[i].substr(lines[i].indexOf(' ')+1);
        }
        i += 1;
    }
    if (lines[i] == "<EDGES>") {
        i += 1;
        while (i < lines.length) {
            words = lines[i].split(/\s+/g);
            if (words[1]!= "--" && words[1] !="->") {
                $("#errortext").text("Unknown edge type " + words[1]);
                return;
            }
            if (data.nodes[words[0]] === undefined) {
                $("#errortext").text("Unknown node " + words[0]);
                return;
            }
            if (data.nodes[words[2]] === undefined) {
                $("#errortext").text("Unknown node " + words[2]);
                return;
            }
            out = [
                words[0],
                words[1],
                words[2],
                
            ];
            if (words.length == 4) {
                out.push(words[3]);
            }
            data.edges.push(out);
            i+=1;
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




// Math rendering code
// Based on 
// http://visjs.org/examples/network/nodeStyles/HTMLInNodes.html
// https://www.embeddedrelated.com/showarticle/599.php
// It is given a list of strings with labels. Those surrounded by $$ are rendered with latex
// and those not surrounded are passed through. The output is in the following format for each label:
//  {img: <svg image of latex math>, label: <label>}
// img is only populated if it was determined that the equation was latex.
// Since this is unfortunately a long-running task that requires hacks upon hacks, we also require a callback
// that will be called once this finishes.
function renderMathForLabels(labelList, resultCallback) {
    var output = [];
    var DOMURL = window.URL || window.webkitURL || window;
    
    // This is put into the mathrender div to render as svg
    var mathText = "";
    // Holds which labels are to be rendered in latex
    var mathChildren = [];
    for (var i=0; i < labelList.length; i++) {
        var currentLabel = labelList[i];
        if (currentLabel.startsWith("$") && currentLabel.endsWith("$")) {
            var mathstring = currentLabel.substr(1,currentLabel.length-2);
            // We need to include the math in a bbox with a bit of padding so that it displays properly in vis
            // An issue remains that the visualization doesn't properly use the width - there is no "ellipseImage" in visjs
            mathText += "<div id='mathrender_"+i + "'>$$\\bbox[5pt]{ " + mathstring + " }$$</div>";
            mathChildren.push(i);
        }
        output.push({label: currentLabel});
    }
    if (mathChildren.length == 0) {
        // If we have no math to render, then just run the callback
        resultCallback(output);
    } else {
        // We now put the math to render in the mathrender div
        $("#mathrender").html(mathText);
        
        // ... And call mathjax to render it!
        // http://stackoverflow.com/questions/7924341/mathjax-js-api-how-to-send-a-var-with-text-in-it-and-get-html-out-of-it
        MathJax.Hub.Queue(
        ["Typeset",MathJax.Hub],
        function () {
            
            // MathJax rendered the math, so we extract the SVG from the elements
            for (var i=0; i < mathChildren.length;i++) {
            
                // https://viereck.ch/latex-to-svg/
                var glyphs = document.getElementById('MathJax_SVG_glyphs');
                var svg = $("#mathrender_"+mathChildren[i]+" span.MathJax_SVG").children(":first").get(0);
                var svgString = '<' + '?xml version="1.0" encoding="UTF-8" standalone="no" ?' + '>\n';
                svgString += '<svg xmlns="http://www.w3.org/2000/svg"';
                for (var j = 0; j < svg.attributes.length; j++) svgString += ' ' + svg.attributes[j].name + '="' + svg.attributes[j].value + '"';
                svgString += '>\n';
                svgString += glyphs.outerHTML;
                svgString += '\n';
                svgString += svg.innerHTML;
                svgString += '\n</svg>';
                
                
                
                //http://visjs.org/examples/network/nodeStyles/HTMLInNodes.html
                var svgblob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
                var outputURL = DOMURL.createObjectURL(svgblob);
                
                
                output[mathChildren[i]].img = outputURL;
            }
            $("#mathrender").html("");
            resultCallback(output);
        }
      );
    }
    
    
  
    
    
}





