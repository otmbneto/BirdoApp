var doc = fl.getDocumentDOM();

if (doc) {
    var uri = doc.pathURI;

    // remove filename
    var folderURI = uri.substring(0, uri.lastIndexOf("/") + 1);

    // convert to normal OS path
    var folderPath = FLfile.uriToPlatformPath(folderURI);

    // open explorer
    FLfile.runCommandLine('explorer "' + folderPath + '"');
}