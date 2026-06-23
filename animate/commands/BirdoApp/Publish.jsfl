function toString(obj) {
    var out = "{";

    for (var k in obj) {
        if (obj.hasOwnProperty(k)) {

            var v = obj[k];

            if (typeof v == "object") {
                v = toString(v);
            } else if (typeof v == "string") {
                v = '"' + v + '"';
            }

            out += '"' + k + '":' + v + ",";
        }
    }

    if (out.charAt(out.length - 1) == ",") {
        out = out.substring(0, out.length - 1);
    }

    out += "}";

    return out;
}

var doc = fl.getDocumentDOM();

if (!doc || !doc.pathURI) {
    fl.trace("No saved document open.");
} else {

    var context = eval("(" + doc.getDataFromDocument("pipeline_context") + ")");
    var filePath = FLfile.uriToPlatformPath(doc.pathURI);
    filePath = filePath.replace(/\\/g, "\\\\");

    context["app"] = "adobe animate"
    context["file"] = filePath

    fl.trace(toString(context));
    var payload =
        '{"command":"publish",' +
        '"context":' + toString(context) + '}';


    fl.trace(payload);
    var cmd =
        'curl -X POST ' +
        '-H "Content-Type: application/json" ' +
        '-d "' + payload.replace(/"/g, '\\"') + '" ' +
        'http://127.0.0.1:5001';

    var result = FLfile.runCommandLine(cmd);

    fl.trace(result);
}