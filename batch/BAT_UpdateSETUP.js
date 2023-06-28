include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


BAT_UpdateSETUP();

function BAT_UpdateSETUP(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	var entity_type = projectDATA.entity.type;
	
	//get tip node
	var tip_node = getTipNode(entity_type);
	//get lineup node
	var lineup_node = getLineupNode(entity_type);
	
	//update tvgs
	Print("TIP: " + tip_node);
	Print("LINEUP: " + lineup_node);

}

//retorna o caminho do tip node pra ser atualizado; (add se nao existir!)
function getTipNode(asset_type){
	//tip nodes
	var tip_group = asset_type == "SHOT" ? "Top/REF_ANIM-G" : "Top/SETUP";
	var node_name = asset_type == "SHOT" ? "REF_ANIM" : "tips";
	var tip_node = tip_group + "/" + node_name;
	if(node.getName(tip_node) == ""){
		var upnode = asset_type == "SHOT" ? tip_group + "/REF_ANIM-P" : tip_group + "/Camera-P";
		var downnode = asset_type == "SHOT" ? tip_group + "/Composite" : tip_group + "/Comp_VIEW";
		var coord = asset_type == "SHOT" ? {x: 234, y: 431, z: 1} : {x: 815, y: -180, z: 1};
		tip_node = BD2_addNode("READ", tip_group, node_name, coord);
		if(!tip_node){
			Print("ERROR addind tip node!");
			return false;
		}
		node.link(upnode, 0, tip_node, 0, false, false);
		if(asset_type == "SHOT"){
			node.link(tip_node, 0, downnode, 0, false, true);
		} else {
			node.link(tip_node, 0, downnode, 2, false, true);
		}
	}	
	return tip_node;
}

//retorna o caminho do LINEUP node pra ser atualizado; (add se nao existir!)
function getLineupNode(asset_type){
	//tip nodes
	var lineup_group = asset_type == "SHOT" ? "Top/REF_ANIM-G" : "Top/SETUP";
	var node_name = asset_type == "SHOT" ? "LINEUP" : "Lineup";
	var lineup_node = lineup_group + "/" + node_name;
	if(node.getName(lineup_node) == ""){
		var upnode = asset_type == "SHOT" ? lineup_group + "/REF_ANIM-P" : "";
		var downnode = asset_type == "SHOT" ? lineup_group + "/Composite" : lineup_group + "/Comp_VIEW";
		var coord = asset_type == "SHOT" ? {x: 234, y: 431, z: 1} : {x: 815, y: -180, z: 1};
		lineup_node = BD2_addNode("READ", lineup_group, node_name, coord);
		if(!lineup_node){
			Print("ERROR addind tip node!");
			return false;
		}
		if(asset_type == "SHOT"){
			node.link(upnode, 0, lineup_node, 0, false, false);
			node.link(lineup_node, 0, downnode, 0, false, true);
		} else {
			node.link(lineup_node, 0, downnode, 2, false, true);
		}
	}	
	return lineup_node;
}


function checkUpdates(lineupNode, tipsNode, projData){
	
	
	
}