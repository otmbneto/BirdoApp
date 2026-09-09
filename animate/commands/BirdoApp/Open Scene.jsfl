var payload = '{"command":"open_scene","context": {"app": "adobe animate"}}';

var cmd =
'curl -X POST ' +
'-H "Content-Type: application/json" ' +
'-d "' + payload.replace(/"/g, '\\"') + '" ' +
'http://127.0.0.1:5001';

var result = FLfile.runCommandLine(cmd);

fl.trace(result);