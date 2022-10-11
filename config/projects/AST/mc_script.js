function onCheckboxValueChanged(params, checkedVal){
    var placeholder = params.targetNodes[params.targetNodes.length -1];
    var draw_col = node.linkedColumn(placeholder, 'DRAWING.ELEMENT');
    var curr_pose = column.getEntry(draw_col, 1, frame.current());
    MessageLog.trace('Current LipSync: ' + curr_pose);

    var currentFrame = frame.current();
    if(node.getMatrix(placeholder, currentFrame).axis(0).x < 0){
        var currentX = node.getTextAttr(placeholder, currentFrame, 'SCALE.X');
        node.setTextAttr(placeholder, 'SCALE.X', currentFrame, (currentX * -1));
    }
    if(node.getMatrix(placeholder, currentFrame).axis(1).y < 0){
        var currentY = node.getTextAttr(placeholder, currentFrame, 'SCALE.Y');
        node.setTextAttr(placeholder, 'SCALE.Y', currentFrame, (currentY * -1));
    }

    for(var i=0; i<params.targetNodes.length; ++i){
        var targetNode = params.targetNodes[i];
        if(node.getName(targetNode) == curr_pose){
        node.showControls(targetNode,checkedVal);
        } else if(node.isControlShown(targetNode)){
        node.showControls(targetNode, false);
        }
    }
}
include(fileMapper.toNativePath(specialFolders.resource+'/scripts/utilities/ui/functionWizard/mcs/mcCheckboxFunction.js'));