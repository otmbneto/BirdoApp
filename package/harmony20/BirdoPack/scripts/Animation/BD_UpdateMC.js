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
			continue;
		}
		
		//update mc new visual
		node.setTextAttr(mc_list[i], "label_screen_space", 1, false);
		node.setTextAttr(mc_list[i], "label", 1, "");
		
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
	
	//update place holder (desenha o lipsync no over layer
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

		column.setEntry(coluna, 1, frameCur, exp1);
		
		//desenha o lipsinc na overlayer do node
		function create_lipsyncDRAWING_OL(projectDATA, phnode, fr){
			//var lipsync_templatejson = projectDATA.birdoApp + "templates/drawings_data/" + projectDATA.prefix + "/_LipsyncPH_OL.json";
			var lipsync_templatejson = "C:/Users/Leonardo/AppData/Roaming/BirdoApp_SANDBOX/templates/drawings_data/AST/_LipsyncPH_OL.json";
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
}