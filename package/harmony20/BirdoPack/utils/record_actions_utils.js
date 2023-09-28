/*
	utils of record actions tool

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

//TODO: 
 // - refatorar funcao de getModifications (tentar incluir a parte do check do rename e do delete create nos primeiros dois loops)
 // - testar funcoes criadas pra saber se precisa do try catch em mais funcoes (esta somente no link e unlink)


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
				var col = node.linkedColumn(nodeP, attName);
				if(!col){
					this.attributes[attName] = {
						type: subList[j].typeName(),
						value: subList[j].textValue()
					}
				}
			}
		} else {
			var attName = myList[i].fullKeyword();
			var col = node.linkedColumn(nodeP, attName);
			if(!col){
				this.attributes[attName] = {
					type: myList[i].typeName(),
					value: myList[i].textValue()
				};
			}
		}
	}
	this.coordinate = BD2_get_node_coord(nodeP);
	var conection_data = BD2_get_node_connections_data(nodeP);
	this.connection = {input: conection_data.input, output: conection_data.output};
	//delete this.coordinate.z;
	
}


//compare two objects or two lists
function compareObjects(obj1, obj2){
	return JSON.stringify(obj1) == JSON.stringify(obj2);
}


function getNodesModification(parent_node, nodes1, nodes2){
	var diff_data = {
		parent_node: parent_node,
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
					update_attr: {}
				};
				for(subItem in nodes1[item]["attributes"]){
					if(!compareObjects(nodes1[item]["attributes"][subItem], nodes2[item]["attributes"][subItem])){
						attDiffData["update_attr"][subItem] = nodes2[item]["attributes"][subItem];
					}
					
				}
				diff_data["change_attr"].push(attDiffData);
			}
			
			//coordinates
			var coord1 = nodes1[item]["coordinate"];
			var coord2 = nodes2[item]["coordinate"];
			delete coord1.z;
			delete coord2.z;
			if(!compareObjects(coord1, coord2)){
				diff_data["move_coord"].push({node_path: nodes2[item].node, coord: nodes2[item].coordinate});
			}
			
			//network connection (connect)
			if(!compareObjects(nodes1[item]["connection"]["input"], nodes2[item]["connection"]["input"])){
				//check link
				nodes2[item]["connection"]["input"].forEach(function(connectionItem, port_index){
					if(JSON.stringify(nodes1[item].connection.input).indexOf(JSON.stringify(connectionItem)) == -1){
						var srcData = connectionItem;
						srcData["create_port"] = getNeedToAddPortSrc(item, nodes1, nodes2);
						diff_data["link_nodes"].push({source: srcData, destiny: {node: nodes2[item].node, create_port: getNeedToAddPortDst(item, nodes1, nodes2), port: port_index}});
					}
				});
				//check unlink
				nodes1[item]["connection"]["input"].forEach(function(connectionItem, port_index){
					if(JSON.stringify(nodes2[item].connection.input).indexOf(JSON.stringify(connectionItem)) == -1){
						diff_data["unlink_nodes"].push({node: nodes2[item].node, port: port_index});
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
		//reset wrong data connections (just renamed nodes, no reconection!)
		diff_data["link_nodes"] = [];
		diff_data["unlink_nodes"] = [];
	//define created nodes
	} else if(Object.keys(nodes1).length < Object.keys(nodes2).length){
		
		diff_data["created"] = diff_new;
		diff_new.forEach(function(node_item){
			Print(" > node created: " + node_item);
		});
		
	//define renamed nodes
	} else{
		var is_renamed = false;
		diff_old.forEach(function(item, index){

			if(is_renamed_node(item, diff_new[index])){
				var new_name = diff_new[index].node.split("/");
				diff_data["renamed"].push({from: item.node, to: new_name[new_name.length - 1]});
				is_renamed = true;
				return;
			} else {
				Print("can't find renmaed node: " + item.node);
			}
			
		});
		//reset wrong data connections (just renamed nodes, no reconection!)
		if(is_renamed){	
			diff_data["link_nodes"] = [];
			diff_data["unlink_nodes"] = [];
		}
	}
	return diff_data;
}


//return if SRC node need to add port in connect action
function getNeedToAddPortSrc(nodeName, oldSnap, newSnap){
	var oldNode = oldSnap[nodeName].node;
	var test_type = (node.type(oldNode) == "GROUP" || node.type(oldNode) == "MULTIPORT_IN")
	var test_outputs_number = oldSnap[nodeName].connection.output.length < newSnap[nodeName].connection.output.length;
	return test_type && test_outputs_number;
}
//return if DST node need to add port in connect action
function getNeedToAddPortDst(nodeName, oldSnap, newSnap){
	var oldNode = oldSnap[nodeName].node;
	var test_type = (node.type(oldNode) == "COMPOSITE" || node.type(oldNode) == "MULTIPORT_OUT");
	var test_outputs_number = oldSnap[nodeName].connection.input.length < newSnap[nodeName].connection.input.length;
	return test_type && test_outputs_number;
}

function is_renamed_node(node_data1, node_data2){
	return node_data1["node"] != node_data2["node"] && node_data1.connection.z == node_data2.connection.z && node_data1.elementId == node_data2.elementId;
}


function getModifications(snap1, snap2){
	if(compareObjects(snap1, snap2)){
		Print("No changes to nodeview!");
		return false;
	} else {
		if(snap1.parentGroup != snap2.parentGroup){
			Print("Error! Nodeview Group Changed! Will only work on same group!");
			return false;
		}
		Print("nodes changed!");
		return getNodesModification(snap1.parentGroup, snap1.nodes, snap2.nodes);
	}
}
exports.getModifications = getModifications;


//class to write final scriot. Convert the modification data into string functions
function JSScript(modifications_data_list, action_name){
	
	//modification data list
	this.modification_list = modifications_data_list;
	this.header = '/*\n    Script created automatically using RecordActions tool.\n    created date: ' + new Date() + '\n*/\n';
	this.includes_lib = 'include("BD_1-ScriptLIB_File.js");\ninclude("BD_2-ScriptLIB_Geral.js");\n\n';
	
	this.main_func_line = 'function ' + action_name + '(){\n    ';
	this.curr_nv_group_var = '\n    //current node view group\n    var curr_nv = getCurrentGroupNV();\n\n    ';
	this.start_undo = 'scene.beginUndoRedoAccum("Script Action : ' + action_name + '");\n\n    Print("Start action : ' + action_name + '");\n\n    ';
	this.end_undo = '\n    scene.endUndoRedoAccum()\n\n';
	this.exports_func = '}\nexports.' + action_name + ' = ' + action_name + ';\n';
	
	//extra functions
	this.helper_function = '\n//return current group in node view\nfunction getCurrentGroupNV(){\n    var nodeview = view.viewList().filter(function(item){ return view.type(item) == "Node View"});\n    return view.group(nodeview[0]);\n}\n';
	
	
	//try function 
	this.start_try = 'try{\n    ';
	this.end_try = '}catch(e){\n        Print(e);\n    }\n    ';
	
	this.functions_data = {
		deleted: '    var action = node.deleteNode(curr_nv + "{NODE_PATH}", true, true);\n    ',
		created: '    var action = node.add(curr_nv, "{NODE_NAME}", "{NODE_TYPE}", {COORD_X}, {COORD_Y}, 0);\n    ',
		renamed: '    var action = BD2_renameNode(curr_nv + "{NODE_PATH}", "{NODE_NAME}");\n    ',
		change_attr: '    var action = node.setTextAttr(curr_nv + "{NODE_PATH}", "{ATTR_NAME}", {FRAME}, {ATTR_VALUE});\n    ',
		move_coord: '    var action = node.setCoord(curr_nv + "{NODE_PATH}", {COORD_X}, {COORD_Y});\n    ',
		link_nodes: '    var action = node.link(curr_nv + "{SRC_NODE}", {PORT1}, curr_nv + "{DST_NODE}", {PORT2}, {CREATE_PORT_SCR}, {CREATE_PORT_DST});\n    ',
		unlink_nodes: '    var action = node.unlink(curr_nv + "{NODE_PATH}", {PORT});\n    '
	}


	//callbacks
	this.create_action_functions = function(mod_data, mod_index){

		var function_string = "";
		//deleted
		if(mod_data.deleted.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => delete node:\n".replace("{ACTION_NUMBER}", mod_index);
			for(var i=0; i< mod_data.deleted.length; i++){
				var relativendePath = getRelativePath(mod_data.deleted[i]);
				function_string += this.functions_data["deleted"].replace("{NODE_PATH}", relativendePath);
				function_string += ('Print("Node deleted: " + curr_nv + "' + relativendePath + ' => " + action);\n    ');
			}
		}
		//created 
		if(mod_data.created.length > 0){
			function_string += '//Action: {ACTION_NUMBER} => create node\n'.replace("{ACTION_NUMBER}", mod_index);
			for(var i=0; i< mod_data.created.length; i++){
				var nodeName = node.getName(mod_data.created[i].node);
				var create_func = this.functions_data["created"].replace("{NODE_NAME}", nodeName);
				create_func = create_func.replace("{NODE_TYPE}", mod_data.created[i].nodeType);
				create_func = create_func.replace("{COORD_X}", mod_data.created[i].coordinate.x);
				create_func = create_func.replace("{COORD_Y}", mod_data.created[i].coordinate.y);
				function_string += create_func;
				function_string += ('Print("Node created: ' + nodeName + ' => " + action);\n    ');
			}
		}
		//renamed
		if(mod_data.renamed.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => rename node\n".replace("{ACTION_NUMBER}", mod_index);
			for(var i=0; i< mod_data.renamed.length; i++){
				var relativendePath = getRelativePath(mod_data.renamed[i].from);
				var create_func = this.functions_data["renamed"].replace("{NODE_PATH}", relativendePath);
				create_func = create_func.replace("{NODE_NAME}", mod_data.renamed[i].to);
				function_string += create_func;
				function_string += ('Print("Node renamed from: " + curr_nv + "' + relativendePath + ' : to : " + action);\n    ');				
			}
		}
		//change attr
		if(mod_data.change_attr.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => change node attr\n".replace("{ACTION_NUMBER}", mod_index);
			for(var i=0; i< mod_data.change_attr.length; i++){
				for(att in mod_data.change_attr[i].update_attr){
					var relativendePath = getRelativePath(mod_data.change_attr[i].node_path);
					var value = mod_data.change_attr[i].update_attr[att].value;
					var create_func = this.functions_data["change_attr"].replace("{NODE_PATH}", relativendePath);
					create_func = create_func.replace("{ATTR_NAME}", att);
					create_func = create_func.replace("{FRAME}", 1); // non column attributes
					create_func = create_func.replace("{ATTR_VALUE}", value); // non column attributes
					function_string += create_func;
					function_string += ('Print("Node change attr: " + curr_nv + "' + relativendePath + ' : att : ' + att + ' : value : ' + value + ' => " + action);\n    ');					
				}
			}
		}
		//move coord
		if(mod_data.move_coord.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => move node\n".replace("{ACTION_NUMBER}", mod_index);
			for(var i = 0; i < mod_data.move_coord.length; i++){
				var relativendePath = getRelativePath(mod_data.move_coord[i].node_path);
				var create_func = this.functions_data["move_coord"].replace("{NODE_PATH}", relativendePath);
				create_func = create_func.replace("{COORD_X}", mod_data.move_coord[i].coord.x);
				create_func = create_func.replace("{COORD_Y}", mod_data.move_coord[i].coord.y);
				function_string += create_func;
				function_string += ('Print("Node move coord: " + curr_nv + "' + relativendePath + ' => " + action);\n    ');				
			}
		}
		//unlink nodes
		if(mod_data.unlink_nodes.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => link node\n    ".replace("{ACTION_NUMBER}", mod_index);
			function_string += this.start_try;
			for(var i=0; i< mod_data.unlink_nodes.length; i++){
				var relativendePath = getRelativePath(mod_data.unlink_nodes[i].node);
				var unlinkPort = mod_data.unlink_nodes[i].port;
				var create_func = this.functions_data["unlink_nodes"].replace("{NODE_PATH}", relativendePath);
				create_func = create_func.replace("{PORT}", unlinkPort);
				function_string += create_func;
				function_string += ('    Print("Node unlink: " + curr_nv + "' + relativendePath + ' port : ' + unlinkPort + ' => " + action);\n    ');							
			}
			function_string += this.end_try;
		}
		//link nodes
		if(mod_data.link_nodes.length > 0){
			function_string += "//Action: {ACTION_NUMBER} => link node\n    ".replace("{ACTION_NUMBER}", mod_index);
			function_string += this.start_try;
			for(var i=0; i< mod_data.link_nodes.length; i++){
				var relativeSrcNodePath = getRelativePath(mod_data.link_nodes[i].source.node);
				var relativeDstNodePath = getRelativePath(mod_data.link_nodes[i].destiny.node);
				var srcPort = mod_data.link_nodes[i].source.port;
				var dstPort = mod_data.link_nodes[i].destiny.port;
				var create_func = this.functions_data["link_nodes"].replace("{SRC_NODE}", relativeSrcNodePath);
				create_func = create_func.replace("{PORT1}", srcPort);
				create_func = create_func.replace("{DST_NODE}", relativeDstNodePath);
				create_func = create_func.replace("{PORT2}", dstPort);
				create_func = create_func.replace("{CREATE_PORT_SCR}", mod_data.link_nodes[i].source.create_port);
				create_func = create_func.replace("{CREATE_PORT_DST}", mod_data.link_nodes[i].destiny.create_port);
				function_string += create_func;
				function_string += ('    Print("Node link: " + curr_nv + "' + relativeSrcNodePath + ' port > ' + srcPort + ' to node : " + curr_nv + "' + relativeDstNodePath + ' port > ' + dstPort + ' => " + action);\n    ');							

			}
			function_string += this.end_try;
		}
		return function_string;
	}
	
	
	this.getScriptString = function(){
		var final_script = this.header;
		final_script += this.includes_lib;
		final_script += this.main_func_line;
		final_script += this.curr_nv_group_var;
		final_script += this.start_undo;
		//start actions 
		for(var i=0; i<this.modification_list.length; i++){
			final_script += this.create_action_functions(this.modification_list[i], i);
		}
		final_script += this.end_undo;
		final_script += this.exports_func;
		final_script += this.helper_function;
		return final_script;
	}	

	//helper function
	//get relative path
	function getRelativePath(nodeP){
		var namearr = nodeP.split("/");
		return "/" + namearr[namearr.length - 1];
	}

}
exports.JSScript = JSScript;




/*
//replace all matches in string
function replaceAll(string, search, rep){
	if(typeof search == "function"){
		if(!search.global){
			Print("REPLACEALL ERROR: regex parameter must be set to global!");
			return false;
		}			
		var re = search;
	} else {
		var re = new RegExp(search,"g");
	}
	return string.replace(re, rep);
}
*/