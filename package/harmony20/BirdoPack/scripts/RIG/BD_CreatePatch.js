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
	var options = get_options(sorted);
	if(!options){
		Print("Canceled...");
		scene.cancelUndoRedoAccum();
		return;
	}
	
	//unconnect main node and define dest comp
	var nodes_connected = uncoonectNode(options.main_node);
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
	var patch_coord = get_patch_coord(sorted, comp_node, options.name);
	
	//create patch group
	var patch = createPatch(options, patch_coord);
	
	if(!patch){
		Print("Error creating patch!");
		scene.cancelUndoRedoAccum();
		return;
	}
	
	relinkNodes(options, patch, comp_node);
	
	scene.endUndoRedoAccum();		
	
	//HELPER
	function createPatch(options, coords){
		
		var parentGroup = node.parentNode(options.main_node);
		//get main group coordinates
		var patchX = coords.x;
		var patchY = coords.y;

		//add main group
		var patch_group = node.add(parentGroup, ("PATCH_" + options.name), "GROUP", patchX, patchY, 0);
		if(!patch_group){
			Print("ERROR creating group!");
			return false;
		}
		var inputModule = node.getGroupInputModule(patch_group, "", 0, -500, 0);
		var outputModule = node.getGroupOutputModule(patch_group, "", 0, 100, 0);
		var comp = node.add(patch_group, "Composite", "COMPOSITE", 0, 0, 0);

		//add patch inside nodes
		var line_type = options.patch == "LAYER_SELECTOR" ? "LINE_ART" : "TbdColorSelector";
		var fill_type = options.patch == "LAYER_SELECTOR" ? "COLOR_ART" : "TbdColorSelector";
		var line_art = node.add(patch_group, "Line", line_type, 0, -400, 0);
		var color_art = node.add(patch_group, "Fill", fill_type, 120, -400, 0);
		
		//if color selector, change att
		if(options.patch == "COLOR_SELECTOR"){
			node.setTextAttr(line_art, "selectedColors", 1, options.colors.line);
			node.setTextAttr(color_art, "selectedColors", 1, options.colors.fill);		
		}
		
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
		for(var i=0; i<options.masked_list.length; i++){
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

	function relinkNodes(options, patchNode, dest_comp){//connect patch node to all nodes
		//if exists comp dst, connect it
		if(dest_comp){
			node.link(patchNode, 0, dest_comp, node.numberOfInputPorts(dest_comp), false, true); 
		}
		//link main node to patch
		node.link(options.main_node, 0, patchNode, 0, false, false);

		//unconnect and connect masked nodes
		for(var i=0; i<options.masked_list.length; i++){
			uncoonectNode(options.masked_list[i]);
			var port = i + 1;
			node.link(options.masked_list[i], 0, patchNode, port, false, false);
		}
	}
}

function get_options(selnode_list){//interface simples para pegar options
	
	//palette list for scene
	var plist = PaletteObjectManager.getScenePaletteList();
	
	d = new Dialog;
	d.title = "Create Patch";
	d.addSpace(5);

	var input_name = new LineEdit();
	input_name.label = "Patch Name:";
	input_name.text = node.getName(selnode_list[0]);
	d.add(input_name);
	d.addSpace(10);

	var main_node = new ComboBox();
	main_node.label = "Main Node:"
	main_node.editable = false;
	main_node.itemList = selnode_list;
	d.add(main_node);
	d.addSpace(10);

	var l1 = new Label();
	l1.text = "Escolha tipo de patch:";
	d.add(l1);

	var group = new GroupBox;		

	var layer_filter = new RadioButton();
	layer_filter.text = "Layer filter";
	layer_filter.checked = true;
	group.add(layer_filter);
	
	var color_selector = new RadioButton();
	color_selector.text = "Color-Selector";
	group.add(color_selector);

	d.addSpace(5);
	d.add(group);
	d.addSpace(10);
	
	var rc = d.exec();
	if(!rc){ 
		return false;
	}

	//retira o main da lista e cria masked list
	var masked_list = selnode_list;
	var index = selnode_list.indexOf(main_node.currentItem);
	masked_list.splice(index, 1);

	return {
		patch: color_selector.checked ? "COLOR_SELECTOR" : "LAYER_SELECTOR",
		name: input_name.text,
		main_node: main_node.currentItem,
		masked_list: masked_list,
		colors: color_selector.checked ? getLineAndFillColors(main_node.currentItem) : null
	};
	
	//HELPER
	function getLineAndFillColors(node_path){
		var fill_color = null;
		var line_color = null;
		var currentDrawing = Drawing.Key({node : node_path, frame : frame.current()});
		if(!currentDrawing){
			Print("No drawing valid selected!");
			return false;
		}
		var config = {
			drawing  : currentDrawing
		};

		var data = Drawing.query.getData(config); 
		data.arts.forEach(function(art){
			if(!art.hasOwnProperty("layers")){
				return;
			}
			art.layers.forEach(function(layer){
				if("contours" in layer){
					fill_color = layer.contours[0].colorId;
				} 
				if("strokes" in layer){
					line_color = layer.strokes[0].colorId;
				}
			});
		});
		
		return {
			fill: get_color_att_text(fill_color),
			line: get_color_att_text(line_color)
		};
	}
	function get_color_att_text(id){//find color and convert object to formated string 
		var pal = plist.findPaletteOfColor(id);
		var colorObj = pal.getColorById(id);
		var obj = colorObj["colorData"];
		obj["colorId"] = colorObj.id;
		obj["name"] = colorObj.name;
		return JSON.stringify([obj]);
	}
}