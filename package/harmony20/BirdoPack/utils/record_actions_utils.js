/*
	utils of record actions tool

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

//TODO: melhorar snapshot da nodeview: 
 // - tirar os atributos q tenham coluna da lista de atributos para listar no snapshot da network
 // - criar funcoes para setar parametro do node criado (Attr, coordenadas e links) 
 // - definir se o node.link vai usar as flags de criar port na funcao getModifications()
   // (testar se mudou numero de output do node nos dois snapshots) e por node type


//snap shot of node view
function getNodeViewGroupSnapShop(parent_group){
		
	var all_nodes = node.subNodes(parent_group);	
	var nv_snapshot = {
		parentGroup : parent_group,
		frame: frame.current(),
		nodes: {}
	}
	all_nodes.forEach(function(item){
		var node_data = new NodeAttData(item, frame.current());
		nv_snapshot["nodes"][node.getName(item)] = node_data;
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
	this.state = node.getEnable(nodeP);
	this.nodeType = node.type(nodeP);
	this.elementId = node.getElementId(nodeP);
	this.attributes = {};
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
	delete this.coordinate.z;
}


//compare two objects or two lists
function compareObjects(obj1, obj2){
	return JSON.stringify(obj1) == JSON.stringify(obj2);
}


function getNodesModification(nodes1, nodes2){
	var diff_data = {
		deleted: [],
		created: [],
		renamed: [],
		change_attr: [],
		move_coord: [],
		link_nodes: [],
		unlink_nodes: []
	};
	
	//dif lists
	var diff_old = [];
	var diff_new = [];
	for(item in nodes1){
		
		if(!nodes2.hasOwnProperty(item)){
			
			diff_old.push(nodes1[item]);	
			
		} else {
			
			//attr change
			if(!compareObjects(nodes1[item]["attributes"], nodes2[item]["attributes"])){
				
				var attDiffData = {
					node_path: nodes2[item].node,
					update_attr: []
				};
				
				for(subItem in nodes1[item]["attributes"]){
					
					if(compareObjects(item, nodes2[item]["attributes"])){
						attDiffData["update_attr"].push(nodes2[item]["attributes"]["subItem"]);
					}
					
				}
				diff_data["change_attr"].push(attDiffData);
			}
			
			//coordinates
			if(!compareObjects(nodes1[item]["coordinate"], nodes2[item]["coordinate"])){
				diff_data["move_coord"].push({node_path: nodes2[item].node, coord: nodes2[item].coordinate});
			}
			
			//network connection (connect)
			if(!compareObjects(nodes1[item]["connection"]["output"], nodes2[item]["connection"]["output"])){

				nodes2[item]["connection"]["output"].forEach(function(connectionItem, port_index){
					if(JSON.stringify(nodes1[item].connection.output).indexOf(JSON.stringify(connectionItem)) == -1){
						diff_data["link_nodes"].push({source: {node: nodes2[item].node, port: port_index}, destiny: connectionItem});
					} else {
						diff_data["unlink_nodes"].push(connectionItem);
					}
				});
			}
		}
	}
	
	for(item in nodes2){
		if(!nodes1.hasOwnProperty(item)){
			diff_new.push(nodes2[item]);				
		}
	}
	
	//define deleted nodes
	if(Object.keys(nodes1).length > Object.keys(nodes2).length){
		
		diff_data["deleted"] = diff_old.map(function(item){ return item.node});				
		diff_old.forEach(function(node_item){
			Print(" > node deleted: " + node_item);
		});
		
	//define created nodes
	} else if(Object.keys(nodes1).length < Object.keys(nodes2).length){
		
		diff_data["created"] = diff_new;
		diff_new.forEach(function(node_item){
			Print(" > node created: " + node_item);
		});
		
	//define renamed nodes
	} else{

		diff_old.forEach(function(item){
			for(var i=0; i<diff_new.length; i++){
				if(is_renamed_node(item, diff_new[i])){
					diff_data["renamed"].push({from: item, to: diff_new[i]});
				}
			}
		});
		
	}
	return diff_data;
}


function is_renamed_node(node_data1, node_data2){
	var obj1 = node_data1;
	var obj2 = node_data2;
	delete obj1["node"];
	delete obj2["node"];
	return compareObjects(obj1, obj2);
}


function getModifications(snap1, snap2){
	if(compareObjects(snap1, snap2)){
		Print("No changes to nodeview!");
		return false;
	} else {
		Print("nodes changed!");
		return getNodesModification(snap1.nodes, snap2.nodes);
	}
}
exports.getModifications = getModifications;


//class to write final scriot. Convert the modification data into string functions
function WriteScript(modifications_data_list, action_name){
	
	//modification data list
	this.modification_list = modifications_data_list;
	this.header = "/*\n\tScript created automatically using RecordActions tool.\n\tcreated date: " + new Date() + "\n*/";
	this.includes_lib = "include('BD_1-ScriptLIB_File.js');\ninclude('BD_2-ScriptLIB_Geral.js');\n\n";
	
	this.main_func_line = "function " + action_name + "(){\n\t\n\t";
	
	this.start_undo = "scene.beginUndoRedoAccum('Script Action : " + action_name + "');\n\tPrint('Start action '" + action_name + "');\n\t";
	this.end_undo = "scene.endUndoRedoAccum()\n\n};";
	this.exports_func = "exports." + action_name + " = " + action_name + ";";
	this.functions_data = {
		deleted: "node.deleteNode('{NODE_PATH}', true, true);\n\n\t",
		created: "node.add('{PARENT_NODE}','{NODE_NAME}', '{NODE_TYPE}', {COORD_X}, {COORD_Y}, 0);\n\n\t",
		renamed: "//Action: {ACTION_NUMBER} => rename node\n\tnode.rename('{NODE_PATH}', '{NODE_NAME}');\n\n\t",
		change_attr: "//Action: {ACTION_NUMBER} => set node attribute\n\tnode.setTextAttr('{NODE_PATH}', '{ATTR_NAME}', {FRAME}, {ATTR_VALUE});\n\n\t",
		move_coord: "//Action: {ACTION_NUMBER} => set node coordnate\n\tnode.setCoord('{NODE_PATH}', {COORD_X}, {COORD_Y});\n\t",
		link_nodes: "//Action: {ACTION_NUMBER} => link node\n\tnode.link('{SRC_NODE}', {PORT1}, '{DST_NODE}', {PORT2}, {CREATE_PORT_SCR}, {CREATE_PORT_DST});\n\t",
		unlink_nodes: "//Action: {ACTION_NUMBER} => unlink node\n\tnode.unlink('{NODE_PATH}', {PORT});\n\t"
	}

	

	//callbacks
	this.create_action_functions = function(mod_data, mod_index){
		var function_string = "";
		//deleted
		if(mod_data.deleted.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => delete node:\n\t".replace("{ACTION_NUMBER}", mod_index);
			for(var i=0; i< mod_data.deleted.length; i++){
				function_string += this.functions_data["deleted"].replace("{NODE_PATH}", mod_data.deleted[i]);
			}
		}		
		//created 
		if(mod_data.created.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => create node\n\t".replace("{ACTION_NUMBER}", mod_index);
			for(var i=0; i< mod_data.created.length; i++){
				var create_func = this.functions_data["created"].replace("{PARENT_NODE}", mod_data.parent_node);
				create_func.replace("{NODE_NAME}", node.getName(mod_data.node));
				create_func.replace("{NODE_TYPE}", mod_data.nodeType);
				create_func.replace("{COORD_X}", mod_data.coordinate.x);
				create_func.replace("{COORD_Y}", mod_data.coordinate.y);
				function_string += create_func;
			}
		}
		//renamed
		
	}
}

