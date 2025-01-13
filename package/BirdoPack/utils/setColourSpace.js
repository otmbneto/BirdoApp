include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		setColourSpace.js

Description:	Este script seta o espaco de cor da cena (nodes, cena e output);

Usage:		usar como util em outros scripts q gerenciam render ou precisam gerencias espaco de cor

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

//COLOUR-SPACES//
var cs_object = {
	"sRGB": {//trocar saida para Linear-sRGB Output-sRGB
		"cs_SCENE": "Utility - Linear - sRGB",
		"cs_NODES": "Utility - sRGB - Texture",
		"cs_PREVIEW_CAMERA": "Utility - sRGB - Texture",
		"cs_OUTPUT": "Utility - sRGB - Texture"
	},
	"ACES": {
		"cs_SCENE":"ACES - ACEScg",
		"cs_NODES": "Utility - sRGB - Texture",
		"cs_PREVIEW_CAMERA": "Utility - sRGB - Texture",
		"cs_OUTPUT": "ACES - ACES2065-1"
	},
	"NO_COLOUR_SPACE": {
		"cs_SCENE": "",
		"cs_NODES": "",
		"cs_PREVIEW_CAMERA": "",
		"cs_OUTPUT": ""
	}
};


function setColourSpace(colour_space){

	scene.beginUndoRedoAccum("Set Colour-Sspace - " + colour_space);
	
	
	//CHECK IF COLOUR SPACES ARE INSTALLED
	var cs_list = [];
	
	for(item in cs_object[colour_space]){
		cs_list.push(cs_object[colour_space][item]);
	}	
	
	if(colour_space != "NO_COLOUR_SPACE"){
		if(!checkColourSpacesInstalled(cs_list)){
			Print("ERRO! Colour Space " + colour_space + " nao encontrado no sistema!!");
			return false;
		}
	}
	
	//////////SETS SCENE SPACE COLOUR///////////
	var update_scene = scene.setColorSpace(cs_object[colour_space]["cs_SCENE"]);
	Print("scene colour space to " + cs_object[colour_space]["cs_SCENE"] + " : " + update_scene);
	
	//////////SETS SPACE COLOUR FOR READ NODES///////////
	var update_nodes = changeAllNodesColorSpace(cs_object[colour_space]["cs_NODES"]);
	
	//////////SETS SPACE COLOUR FOR DISPLAY (AINDA NAO FUNCIONA!!)///////////
	//var update_preview = preferences.setString("DISPLAY_COLOUR_SPACE", cs_object[colour_space]["cs_PREVIEW_CAMERA"]);
	var update_preview = "NAO_DISPONIVEL AINDA!";
	
	//////////SETS SPACE COLOUR FOR OUTPUT WRITENODES///////////
	var update_writes = updateWriteNodes(cs_object[colour_space]["cs_OUTPUT"]);
	
	var final_msg = "Scene Colour-Space Update:\n  - Scene Update to " + 
		cs_object[colour_space]["cs_SCENE"] + ": " + update_scene + 
		";\n  - Nodes Update to " + cs_object[colour_space]["cs_NODES"] + 
		": " + update_nodes + ";\n  - Preview Update to " + update_preview + 
		";\n  - Write nodes changed to " + cs_object[colour_space]["cs_OUTPUT"] + " : " + update_writes 
		+ ";\n\nMore info in the MessageLog!";
	
	Print(final_msg);
	scene.endUndoRedoAccum();
	
	return final_msg;

/////FUNCOES EXTRAS/////////////
	function changeAllNodesColorSpace(color_space_name){//muda todos os READS da cena para o coolor space desejado
		
		Print("--START CHANGING NODES COLOR SPACE---\n	----- " + color_space_name + " -------");
		var counter = 0;
		var reads = node.getNodes(["READ"]);
		for(var i=0; i<reads.length; i++){
			var nodeName = node.getName(reads[i]);
			var change = node.setTextAttr(reads[i], "COLOR_SPACE", 1, color_space_name);
			//Print("	--NODE: " + reads[i] + " : " + change); 
			if(change){
				counter++;
			}
		}
		var msg = counter + " nodes atualizados";
		Print("---------FEITO! " + msg);
		return msg;
	}

	function checkColourSpacesInstalled(cs_list){//checa se os colour spaces pedidos estao instalados nesta maquina
		var check = true;
		var installed_cs = scene.colorSpaceNames();
		cs_list.forEach(function (x){
											if(installed_cs.indexOf(x) == -1){
												check = false
											}
									});
		return check;
	}

	function updateWriteNodes(colour_space){//atualiza os writenodes da cena para o colourspace especificado
		var counter = 0;	
		var all_writes = node.getNodes(["WRITE"]);	
		for(var i=0; i<all_writes.length; i++){	
			node.setTextAttr(all_writes[i], "COLOR_SPACE", 1, colour_space);
			counter++;
		}
		return counter + " write nodes atualizados";		
	}
}


exports.setColourSpace = setColourSpace;
