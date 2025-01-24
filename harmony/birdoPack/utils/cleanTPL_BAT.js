  /* falta implementar renomear os drawing numero para nomes unicos
-------------------------------------------------------------------------------
Name:		cleanTPL_BAT.js

Description:	Este Script roda no tpl gerado pela birdoLIB SAVE pelo compile

Usage:		Usado Como Batch para limpar as palettes e limpar o valor das linhas da pose/anim ou expr salva

Author:		Leonardo Bazilio Bentolila

Created:	outubro, 2020; update agosto, 2021;
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

cleanTPL_BAT();

function cleanTPL_BAT(){
	
	cleanPalettes();

	var nodes_read = node.getNodes(["READ"]);
	
	for(var i=0; i<nodes_read.length; i++){//limpa LineThick
		node.unlinkAttr(nodes_read[i], "MULT_LINE_ART_THICKNESS");
		node.setTextAttr(nodes_read[i],"ADJUST_PENCIL_THICKNESS", 0, false);
	}

	//rename backdrop
	var assetInfo = get_asset_nodes_info();
	
	if(!renameBackdrop(assetInfo)){
		Print("Fail to rename backdrop!");
	} else {
		Print("Backdrop renamed!");
	}

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
		if(!item.isUsed && palette.isValid()){
			if(curPaletteList.removePaletteById(palette.id)){
				if(BD1_RemoveFile(item.fullpath)){
					Print("Palette: " + palettName + " deletada com sucesso!");
				} else {
					Print("Falha ao deletar o arquivo da paletta: " + item.fullpath);				
				}
			} else {
				Print("Falha ao deletar a paletta: " + palettName);				
			}
		}
	}
}

function renameBackdrop(assetInfo){//renomeia o backdrop do asset com as infos
	var backdrops = Backdrop.backdrops(node.root());
	
	if(backdrops.length == 0){
		Print("No need to change the backdrop!");
		return false;
	}
	
	var newBackdrops_list = [];
	backdrops.forEach(function(x){ 
		var new_bd = null;
		var peg_collision = check_coord_collision(BD2_get_node_coord(assetInfo.pegNode), x.position);
		var assetnode_collision = check_coord_collision(BD2_get_node_coord(assetInfo.assetNode), x.position);
		if(peg_collision && assetnode_collision){
			new_bd = x;
			new_bd["title"]["text"] = assetInfo.assetName;
			new_bd["description"]["text"] = assetInfo.version;
			newBackdrops_list.push(new_bd);
		} else {
			newBackdrops_list.push(x);
		}
	});
	return Backdrop.setBackdrops(node.root(), newBackdrops_list);	
}

function get_asset_nodes_info(){//retorna a versao do rig e os nodes do asset (peg e assetnode)
	var main_nodes = node.subNodes(node.root());
	var version_regex = /v\d+/;
	var output = {"version": null};
	if(main_nodes.length != 2){
		Print("alguma coisa diferente nesse asset tpl! Nao existem somenete dois nodes! Nao e possivel mudar o dropbox!");
		return false;
	}		
	for(var i=0; i<main_nodes.length; i++){
		if(node.type(main_nodes[i]) == "PEG"){
			output["pegNode"] = main_nodes[i];
		} else {
			if(version_regex.test(node.getName(main_nodes[i]))){
				output["version"] = version_regex.exec(node.getName(main_nodes[i]))[0];
			}
			output["assetNode"] = main_nodes[i];
			output["assetName"] = node.getName(main_nodes[i]).replace("-" + output["version"], "");
			if(node.isGroup(main_nodes[i])){
				var subGroupsNodes = node.subNodes(main_nodes[i]).filter(function(x){return node.isGroup(x);});
				for(var y=0; y<subGroupsNodes.length; y++){
					if(version_regex.test(node.getName(subGroupsNodes[y]))){
						output["version"] = version_regex.exec(node.getName(subGroupsNodes[y]))[0];
					}	
				}
			}
				
		}
	}
	if(!output["version"] ){
		Print("No version found!");
		return false;
	}		
	return output;	
}

function check_coord_collision(rect1, rect2){//check se as duas coordenadas colidem
	return rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x && rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y;
}