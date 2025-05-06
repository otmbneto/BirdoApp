include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
-------------------------------------------------------------------------------
Name:		comp_render.js

Description:	Este script renderiza os write nodes da cena em comp;

Usage:		usar no render_preview

Author:		Leonardo Bazilio Bentolila

Created:	maio, 2025;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
function comp_render(projectDATA){
	
	if(!projectDATA.check_server()){
		MessageBox.warning("O folder de destino deste projeto está indisponível. Estabeleça conexão antes de fazer o render!",0,0);
		return false;
	}
	
	//desabilita o write final em caso de ter writes extras
	var all_writes = node.getNodes(["WRITE"]);
	var finalWrite = "Top/SETUP/Write_FINAL";
	
	if(all_writes.length > 1){
		if(all_writes.indexOf(finalWrite) != -1){
			node.setEnable(finalWrite, false);	
		}
	}
		
	//render the scene
	Action.perform("onActionComposite()");

	Print("render comp end!!");
}
exports.comp_render = comp_render;