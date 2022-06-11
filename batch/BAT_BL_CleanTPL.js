  /*
-------------------------------------------------------------------------------
Name:		BAT_BL_CleanTPL.js

Description: This script fix empty exposure and clean the unused pallets in the tpl

Usage:		Use this as BAT scritp on recently saved tpl for the library

Author:		Leonardo Bazilio Bentolila

Created:	feb-jun, 2022;
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

BAT_BL_CleanTPL();

function BAT_BL_CleanTPL(){
	
	//clean template unused pallets
	cleanPalettes(); // redo this function to delete only palets in pallet-list

	var nodes_read = node.getNodes(["READ"]);
	
	for(var i=0; i<nodes_read.length; i++){//limpa LineThick
		node.unlinkAttr(nodes_read[i], "MULT_LINE_ART_THICKNESS");
		node.setTextAttr(nodes_read[i],"ADJUST_PENCIL_THICKNESS", 0, false);
		
		//fix empty exposure in node 
		empty_to_Zzero(nodes_read[i]);
	}
	
	
	Print("Clean TPL bat done!");
}
///////////////////funcoes extras

function cleanPalettes(){//limpa as palettas nao usadas do arquivo
	var scene_palettes = BD2_getPalettes(false);
	var curPaletteList = PaletteObjectManager.getScenePaletteList();

	if(curPaletteList.getLock()){
		curPaletteList.releaseLock();
	}
	
	for(var i=(curPaletteList.numPalettes-1); i>=0; i--){
		var palette = curPaletteList.getPaletteByIndex(i);		
		var item = scene_palettes[palette.id];

		if(palette.getLock()){
			palette.releaseLock();
		}
		var palettName = palette.getName();
		if(!item.isUsed && palette.isValid() && item.location == 83){
			if(curPaletteList.removePaletteById(palette.id)){
				if(BD1_RemoveFile(item.fullpath)){
					Print("Palette: " + palettName + " deletada com sucesso!");
				} else {
					Print("Fail to remove the pallet: " + item.fullpath);				
				}
			} else {
				Print("Fail to remove the pallet: " + palettName);				
			}
		}
	}
}


function empty_to_Zzero(read_node){//checks for empty exposure and fix them to the Zzero drawing

	var drawingName = "ZZero";//nome do Zzero

	var firstFrame = 1;
	var endFrame = frame.numberOf();
	var d_col = node.linkedColumn(read_node,"DRAWING.ELEMENT");
	var curr_frame = firstFrame;
	
	var counter = 0;

	while(curr_frame <= endFrame){
		
		var draw = column.getEntry(d_col, 1, curr_frame);
		var colName = column.getDisplayName(d_col);
		
		Print("-- Checking column: " + colName);

		if(draw == ""){
			Print("[EMPTYTOZZERO]" + colName + " changeg to " + drawingName + " at frame: " + curr_frame);
			column.setEntry(d_col, 1, curr_frame, drawingName);
			counter++;
		}
		
		curr_frame++;
	}
	
	return;
}