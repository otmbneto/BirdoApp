// Render PNG sequence to a "render" folder next to the .fla file

var doc = fl.getDocumentDOM();

if (!doc) {
    alert("No document open.");
} else {

    // Full path to current FLA
    var flaPath = doc.pathURI;

    if (!flaPath) {
        alert("Please save the FLA before rendering.");
    } else {

var timeline = doc.getTimeline();

    var totalFrames = timeline.frameCount;

    // Folder of current FLA
    var flaPath = doc.pathURI;
    var baseFolder = flaPath.substring(0, flaPath.lastIndexOf("/"));

    // render folder
    var renderFolder = baseFolder + "/render";

    FLfile.createFolder(renderFolder);

    // Remember current frame
    var originalFrame = timeline.currentFrame;

    for (var i = 0; i < totalFrames; i++) {

        // Go to frame
        timeline.currentFrame = i;

        // Frame number padded
        var frameNum = ("0000" + (i + 1)).slice(-4);

        // Output filename
        var outputPath = renderFolder + "/frame_" + frameNum + ".png";

        // Export CURRENT frame only
        doc.exportPNG(outputPath, true, true);
    }

    // Restore frame
    timeline.currentFrame = originalFrame;

    alert("Rendered " + totalFrames + " frames to:\n" + renderFolder);
    }
}