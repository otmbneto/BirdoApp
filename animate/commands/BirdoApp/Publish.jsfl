var doc = fl.getDocumentDOM();

if (!doc || !doc.pathURI) {
    fl.trace("No saved document open.");
} else {

    var filePath = FLfile.uriToPlatformPath(doc.pathURI);

    filePath = filePath.replace(/\\/g, "\\\\");

    var payload =
        '{"command":"publish",' +
        '"context":{' +
        '"app":"adobe animate",' +
        '"file":"' + filePath + '"' +
        '}}';

    var cmd =
        'curl -X POST ' +
        '-H "Content-Type: application/json" ' +
        '-d "' + payload.replace(/"/g, '\\"') + '" ' +
        'http://127.0.0.1:5001';

    var result = FLfile.runCommandLine(cmd);

    fl.trace(result);
}