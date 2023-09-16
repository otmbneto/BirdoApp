/*
	utils of record actions tool

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


//snap shot of node view
function getNodeViewGroupSnapShop(parent_group){
		
	var all_nodes = node.subNodes(parent_group);	
	var nv_snapshot = {
		parentGroup : parent_group,
		frame: frame.current(),
		nodes: []
	}
	all_nodes.forEach(function(item){
		var node_data = new NodeAttData(item, frame.current());
		nv_snapshot["nodes"].push(node_data);		
	});

	return nv_snapshot;	
}
exports.getNodeViewGroupSnapShop = getNodeViewGroupSnapShop;


//compare two objects
function compareObjects(objA, objB){
	return JSON.stringify(objA) == JSON.stringify(objB);
}


//return current group in node view
function getCurrentGroupNV(){
	var nodeview = view.viewList().filter(function(item){ return view.type(item) == "Node View"});
	return view.group(nodeview[0]);
}
exports.getCurrentGroupNV = getCurrentGroupNV;


//creates an object with node attributes data for the frame fr
function NodeAttData(nodeP, fr){
	this.node = nodeP;
	this.nodeType = node.type(nodeP);
	this.elementId = node.getElementId(nodeP);
	this.attributes = {}
	var myList = node.getAttrList(nodeP, fr); 
	for(var i=0;i<myList.length;i=i+1){
		if(myList[i].hasSubAttributes()){	
			var subList = myList[i].getSubAttributes();
			for(var j=0; j< subList.length; j++){
				var attName = subList[j].fullKeyword();
				this.attributes[attName] = {
					type: subList[j].typeName(),
					value: subList[j].textValue(),
					column: node.linkedColumn(nodeP, attName)
				};
				if(column.type(this.attributes[attName].column) == "DRAWING"){
					this.attributes[attName]["value"] = column.getEntry(this.attributes[attName].column, 1, fr);
				}
			}
		} else {
			var attName = myList[i].fullKeyword();
			this.attributes[attName] = {
				type: myList[i].typeName(),
				value: myList[i].textValue(),
				column: node.linkedColumn(nodeP, attName)	
			};
		}
	}
	this.coordinate = BD2_get_node_coord(nodeP);
	this.connection =  BD2_get_node_connections_data(nodeP);
}


function getModifications(snap1, snap2){
	
	if(compareObjects(snap1, snap2)){
		Print("No changes to nodeview!");
		return "No changes to nodeview!";
	} else {
		Print("nodes changed!");
		return "nodes changed!";
	}
}
exports.getModifications = getModifications;