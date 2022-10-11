/*
-------------------------------------------------------------------------------
Name:			BD_UpdateMC.js

Description:	Este Script para mostrar ou esconder os MC dos rigs na cena (atualiza os nomes de grupos quando faz isso)

Usage:			Show/hide todos MC da cena 

Author:			Leonardo Bazilio Bentolila

Created:		Agosto, 2022
            
Copyright:   	leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_UpdateMC(){
	scene.beginUndoRedoAccum("Update MC");
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	//check if project needs MC update!
	if(projectDATA.prefix != "AST"){
		Print("No need to update MC in this project!");
		return false;
	}
	
	//mc script file 
	var mc_script = projectDATA.birdoApp + "config/projects/" + projectDATA.prefix + "/mc_script.js";
Print("TESTE mc_script: " + mc_script);

	if(BD1_FileExists(mc_script)){
		var ui_script = BD1_ReadFile(mc_script);
	} else {
		var ui_script = null;	
	}
Print("TESTE UI SCRIPT: " + ui_script);

	var scripts_folder = scene.currentProjectPath() + "/scripts/";
	var old_script_files = BD1_ListFiles(scripts_folder, "*.tbState").filter(function(x){ return /TESTE_\w/.test(x)});	
	
	//if changed mc nodes
	var mc_update_fail = false;
	
	//lista todos MC da cena
	var mc_list = node.getNodes(["MasterController"]);
	
	if(mc_list.length == 0){
		Print("No MC found in the scene!");
		return;
	}
	
	for(var i=0; i<mc_list.length; i++){
		
		//update mc nodes (sem ser o master)
		if(node.getName(mc_list[i]) != "mc_Function"){
			node.setTextAttr(mc_list[i], "label_font", 1, "Vertigo Upright 2 BRK");
			if(!fix_mc(projectDATA, mc_list[i])){
				mc_update_fail = true;
			}
			continue;
		}
		
		//update mc new visual
		node.setTextAttr(mc_list[i], "label_screen_space", 1, false);
		node.setTextAttr(mc_list[i], "label", 1, "");
		if(ui_script){
			node.setTextAttr(mc_list[i], "uiScript.editor", 1, ui_script);
		}
		var control_mode = node.getTextAttr(mc_list[i], 1, "SHOW_CONTROLS_MODE");
		var new_mode = control_mode == "Always" ? "Normal" : "Always";
		node.setTextAttr(mc_list[i], "SHOW_CONTROLS_MODE", 1, new_mode);
		Print("Node: " + mc_list[i] + " changed to : " + new_mode);
		
		//search for palce holder node
		var ph = findMCPlaceHolder(mc_list[i]);
		
		if(ph){
			updatePH(projectDATA, ph);
			var enabled = new_mode == "Always";
			node.setEnable(ph, enabled);
		}
		
		if(new_mode == "Normal"){
			Action.perform("onActionHideAllControls()");
		}
	}
	
	if(!mc_update_fail){
		for(var i=0; i<old_script_files.length; i++){
			BD1_RemoveFile(old_script_files[i]);
		}	
	}
	
	scene.endUndoRedoAccum();

	//extra
	function findMCPlaceHolder(mc_node){
		var nextNode = node.srcNode(mc_node,0);
		var phnode = null;
		while(nextNode != ""){
			if(node.type(nextNode) == "READ" && node.getName(nextNode) == "CB_MC"){
				return nextNode;
			}
			nextNode = node.srcNode(nextNode,0);
		}
		return phnode;
	}
	
	//update place holder (desenha o lipsync no over layer)
	function updatePH(projectDATA, phnode){
		node.setEnable(phnode, true);
		var frameCur = frame.current();
		var coluna = node.linkedColumn(phnode, "DRAWING.ELEMENT");
		var timings = column.getDrawingTimings(coluna);
		var exp1 = column.getEntry(coluna, 1, frameCur);

		for (var i=0; i<timings.length; i++){
			column.setEntry(coluna, 1, frameCur, timings[i]);
			Print("drawing OL in : " +  timings[i]);
			Print(create_lipsyncDRAWING_OL(projectDATA, phnode, frameCur));
		}
		
		//turn can animate on
		node.setTextAttr(phnode, "CAN_ANIMATE", 1, true);
		
		//cria key no 1 frame
		createKeysForPlaceHolder(phnode);
		
		column.setEntry(coluna, 1, frameCur, exp1);
		
		//cria keyframe no primeiro frame pro placeholder
		function createKeysForPlaceHolder(phNode){
			var curr_column = node.linkedColumn(phNode, "SCALE.X");
			var currValue = node.getTextAttr(phNode, 1, "SCALE.X");
			if(!curr_column){
				var scale_col = column.generateAnonymousName();
				column.add(scale_col, "BEZIER");
				node.linkAttr(phNode, "SCALE.X", scale_col);
				return column.setEntry(scale_col, 1, 1, currValue);
			}
			Print("No need to create colum for scale : " + phNode);
			return false;
		}		
		
		//desenha o lipsinc na overlayer do node
		function create_lipsyncDRAWING_OL(projectDATA, phnode, fr){
			var lipsync_templatejson = projectDATA.birdoApp + "templates/drawings_data/" + projectDATA.prefix + "/_LipsyncPH_OL.json";
			var ls_data = BD1_ReadJSONFile(lipsync_templatejson);
			var config = {
				drawing: {node: phnode, frame: fr}
			};
			var data = Drawing.query.getData(config);
			var need_update = true;
			var color = null;
			data.arts.forEach(function(x){
				if (x.art == 3){
					Print("Drawing is already updated!");
					need_update = false; 
					return;
				}
				if (x.art == 2){
					color = x.layers[0].strokes[0].colorId;
					return;
				}
			});
			if (need_update){
				//update ol lipsync data with color
				for(var i=0; i<ls_data.layers.length; i++){
					for(var y=0; y<ls_data.layers[i].contours.length; y++){
						ls_data["layers"][i]["contours"][y]["colorId"] = color;
					}
				}
				var configObj = {
						drawing : config.drawing,
						art: ls_data.art,
						label: "Script drawing OL for Lipsync",
						layers: []
					};
				//create layers obj
				for(var i=0; i<ls_data.layers.length; i++){
					var layerObj = {
						layer: i
					};
					layerObj["contours"] = ls_data.layers[i]["contours"];
					configObj["layers"].push(layerObj);
				}
				return DrawingTools.createLayers(configObj);	
			}
			return false;
		}
	}
	
	function fix_mc(projectDATA, node_path){//checa se o mc do rig tem fix, e se tiver muda os atts e copia o arquivo pro scripts da cena
		Print(" --- fix mc : " + node_path);
		var regex_version = /_\d+$/; 
		var asset_regex = /CH\d{3}_\w+/;
		var rig_regex = /\w{3}\.\w+-v\d{2}/;
		var mc_data = {};
		
		var folder_fix = projectDATA.getTBLIB("server") + "MC_data/SCRIPTS/";

		if(!asset_regex.test(node_path)){
			Print("ERROR! This node is not part of a rig!");
			Print(">> " + node_path);
			return false;
		}
		
		//node name test
		if(!/BOCA_\w/.test(node.getName(node_path))){
			Print("-- este mc node nao e um node de BOCA!");
			return false;
		}
		
		//define script file name 
		mc_data["mc_node"] = node_path;
		mc_data["rig_name"] = asset_regex.exec(node_path)[0].replace(regex_version, "");
		mc_data["rig_version"] = rig_regex.exec(node_path)[0].split("-")[1];
		mc_data["mc_name"] = node.getName(node_path);
		mc_data["original_script_name"] = mc_data["mc_name"].replace("BOCA", "TESTE") + ".tbState";
		
		//define fix file info
		var char_fix_folder = folder_fix + mc_data["rig_name"].split("_")[0] + "/";
		var fix_rig_name = mc_data["rig_name"].split("_")[0] + "-" + mc_data["rig_version"];
		var rig_fix_folder = char_fix_folder + fix_rig_name;
		var fix_file = rig_fix_folder + "/" + fix_rig_name + "_" + mc_data["mc_name"] + ".tbState";
		if(!BD1_FileExists(fix_file)){
			Print("No fix file found for rig : " + fix_rig_name);
			return false;
		}
		mc_data["new_script_name"] = BD1_fileBasename(fix_file);
		mc_data["new_script_local_path"] = scripts_folder + mc_data["new_script_name"];
		mc_data["new_script_fix_path"] = fix_file;
		
		//copia arquivo:
		Print("start copying files...");
		if(BD1_CopyFile(mc_data["new_script_fix_path"], mc_data["new_script_local_path"])){
			Print(" -- script file copyed: " + mc_data["new_script_local_path"]);	
		}
		
		//fix mc node
		//att ui_data
		var ui_att_raw = node.getTextAttr(mc_data["mc_node"], 1, "UI_DATA");
		var new_ui_att = ui_att_raw.replace(mc_data["original_script_name"], mc_data["new_script_name"]);
		node.setTextAttr(mc_data["mc_node"], "UI_DATA", 1, new_ui_att);
		//att files
		var col = node.linkedColumn(mc_data["mc_node"], "FILES");
		var new_files_att = column.getEntry(col, 1, 1).replace(mc_data["original_script_name"], mc_data["new_script_name"]);
		column.setEntry(col, 1, 1, new_files_att);

		return true;
	}
}