include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_CreatePatch.js

Description:	Este Script adiciona um grupo de patch embaixo da selecao;

Usage:		Selecione os nodes dessa forma: mais a direita o node principal e mais a esquerda os outros a serem cortados;

Author:		Leonardo Bazilio Bentolila

Created:	Março, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_CreatePatch(){
	
	scene.beginUndoRedoAccum("add patch");	
	
	//define selection
	var sel_nodes = selection.selectedNodes();	
	if(sel_nodes.length == 0){
		MessageBox.warning("Select nodes to create a patch!", 0,0);
		scene.cancelUndoRedoAccum();
		return;
	}
	if(sel_nodes.length == 1){
		MessageBox.warning("Select MORE than one node to crete a patch!",0,0);
		scene.cancelUndoRedoAccum();
		return;
	}
	
	//sort in X position order
	var sorted = sel_nodes.sort(function(a,b){ return node.coordX(b) - node.coordX(a)});
	
	//define name
	var patch_name = Input.getText("Choose Patch Name: ", "", "Add Patch");
	if(!patch_name){
		Print("Canceled...");
		scene.cancelUndoRedoAccum();
		return;
	} else {
		patch_name = patch_name.toUpperCase();
	}	
		
	//define main node and mask nodes listStyleType
	var main_node = sorted.shift();
	var masked_list = sorted;
	
	//unconnect main node and define dest comp
	var nodes_connected = uncoonectNode(main_node);
	if(nodes_connected.length > 1){
		var comp_node = Input.getItem("Choose Comp to Connect Patch", nodes_connected, nodes_connected[0], false, "Comp to Connect");	
		if(!comp_node){
			Print("canceled");
			scene.cancelUndoRedoAccum();
			return;
		}
	} else {
		var comp_node = nodes_connected[0];	
	}
		
	//define patch final coordinates
	var patch_coord = get_patch_coord(sorted, comp_node, patch_name);
	
	//create patch group
	var patch = createPatch(patch_name, masked_list, main_node, patch_coord);
	
	if(!patch){
		Print("Error creating patch!");
		scene.cancelUndoRedoAccum();
		return;
	}
	
	relinkNodes(masked_list, main_node, patch, comp_node);
	
	scene.endUndoRedoAccum();		
}


function createPatch(patch_name, masked_list, main_node, coords){
	
	var parentGroup = node.parentNode(main_node);
	//get main group coordinates
	var patchX = coords.x;
	var patchY = coords.y;

	//add main group
	var patch_group = node.add(parentGroup, ("PATCH_" + patch_name), "GROUP", patchX, patchY, 0);
	if(!patch_group){
		Print("ERROR creating group!");
		return false;
	}
	var inputModule = node.getGroupInputModule(patch_group, "", 0, -500, 0);
	var outputModule = node.getGroupOutputModule(patch_group, "", 0, 100, 0);
	var comp = node.add(patch_group, "Composite", "COMPOSITE", 0, 0, 0);

	//add patch inside nodes
	var line_art = node.add(patch_group, "Line-Art", "LINE_ART", 0, -400, 0);
	var color_art = node.add(patch_group, "Colour-Art", "COLOR_ART", 120, -400, 0);
	var comp_mask = node.add(patch_group, "Comp-Mask", "COMPOSITE", -120, -400, 0);
	var cutter = node.add(patch_group, "Cutter", "CUTTER", -120, -200, 0);

	//set atts
	node.setTextAttr(cutter, "INVERTED", 1, true);
	node.setTextAttr(comp, "COMPOSITE_MODE", 1, "Pass Through");
	//node.setTextAttr(comp_mask, "COMPOSITE_MODE", 1, "Pass Through");

	//connection output
	node.link(comp, 0, outputModule, 0, false, true);
	//connection input main node
	node.link(inputModule, 0, color_art, 0, true, false);
	node.link(inputModule, 0, line_art, 0, false, false);
	//connection input main node
	for(var i=0; i<masked_list.length; i++){
		node.link(inputModule, i+1, comp_mask, i, true, true);
		Print("Added connection to mask: " + i);
	}
	//connect cutter
	node.link(comp_mask, 0, cutter, 0, false, false);
	node.link(color_art, 0, cutter, 1, false, false);
	//connect to main comp
	node.link(color_art, 0, comp, 0, false, true);
	node.link(cutter, 0, comp, 1, false, true);
	node.link(line_art, 0, comp, 2, false, true);

	return patch_group;
}

function get_patch_coord(nodelist, dest_comp, patch_name){//returns the coordnate of the patch group
	var firstX = node.coordX(nodelist[0]);
	var lastX = node.coordX(nodelist[nodelist.length -1]);
	var width_dif = 100 + (patch_name.length * 5);

	var coords = {"x": parseInt(lastX + (firstX - lastX)/2 + width_dif)};
	
	if(dest_comp){
		var firstY = node.coordY(nodelist[0]);
		var lastY = node.coordY(dest_comp);
		coords["y"] = parseInt(lastY + (firstY - lastY)/2);
	} else {
		coords["y"] = node.coordY(nodelist[0]) + 200;
	}
	return coords;
}

function uncoonectNode(nodeP){//desconecta todos nodes abaixo do node, e retorna lista de objetos 
	Print("--Unconnect node: " + nodeP);
	var dst_list = [];
	for(var i=0; i<node.numberOfOutputPorts(nodeP); i++){
		for(var y=node.numberOfOutputLinks(nodeP, i)-1; y>=0; y--){
			var dst_info = node.dstNodeInfo(nodeP, i, y);
			if(dst_info){
				node.unlink(dst_info.node, dst_info.port);
				if(dst_list.indexOf(dst_info.node) == -1){	
					dst_list.push(dst_info.node);
				}
				Print("----Unconnected port: " + i + " link: " + y + " node: " + dst_info.node);
			}			
		}
	}
	Print("-- unconnected " + dst_list.length + " nodes from " + nodeP);
	return dst_list;
}

function relinkNodes(maskedNodes, mainNode, patchNode, dest_comp){//connect patch node to all nodes
	//if exists comp dst, connect it
	if(dest_comp){
		node.link(patchNode, 0, dest_comp, node.numberOfInputPorts(dest_comp), false, true); 
	}
	//link main node to patch
	node.link(mainNode, 0, patchNode, 0, false, false);

	//unconnect and connect masked nodes
	for(var i=0; i<maskedNodes.length; i++){
		uncoonectNode(maskedNodes[i]);
		var port = i + 1;
		node.link(maskedNodes[i], 0, patchNode, port, false, false);
	}
}