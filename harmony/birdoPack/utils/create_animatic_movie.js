/*
	Este script roda a atualização do SETUP em modo batch
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function crate_animatic_movie(){
		
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[BIRDOAPP - crate animatic movie][ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var animatic = findAnimaticNode();
	if(!animatic){
		Print("[BIRDOAPP - crate animatic movie]cant find animatic node...");
		return false;
	}
	
	var node_folder = element.completeFolder(node.getElementId(animatic));
	var img_seq = BD1_ListFiles(node_folder, "*.png");
	
	var temp_folder = projectDATA.createTempFolder("animatic_movie", true);
	img_seq.forEach(function(item){
		var full_path = node_folder + "/" + item;
		var namesplit = item.split("-");
		var index = namesplit[namesplit.length -1].split(".")[0];
		var name = "temp_" + ("0000" + index).slice(-4) + ".png"; 
		
		if(!BD1_CopyFile(full_path, temp_folder + name)){
			Print("[BIRDOAPP - crate animatic movie]Error copying img " + full_path);
			return false;
		}
	});
	
	//create movie	
	var frames_dir = scene.currentProjectPath() + "/frames/";
	BD1_CleanFolder(frames_dir);
	var movie = frames_dir + "animatic.mov";
	var audio = sound.getSoundtrackAll().path();
	var imagePatern = temp_folder + "temp_%04d.png";
	Print("[BIRDOAPP - crate animatic movie]audio: "+ audio);
	Print("[BIRDOAPP - crate animatic movie]Pattern: " + imagePatern);
	if(!BD1_MakeMovieFromImageSeq(projectDATA.birdoApp, imagePatern, scene.getFrameRate(), audio, movie)){
		Print("[BIRDOAPP - crate animatic movie]Fail to create movie from animatic...");
		return false;
	}
	
	Print("[BIRDOAPP - crate animatic movie]Movie animatic created: " + movie);
	return true;
}
exports.crate_animatic_movie = crate_animatic_movie;

function findAnimaticNode(){
	var animatic_g = node.subNodes(node.root()).filter(function(item){ return node.isGroup(item) && node.getName(item).toUpperCase().indexOf("ANIMATIC") != -1});
	if(animatic_g.length != 1){
		Print("[BIRDOAPP - crate animatic movie]More than 1 animatic node in setup..");
		return false;
	}
	Print("[BIRDOAPP - crate animatic movie] Animatic group node found: " + animatic_g[0]);
	var anim_nodes = node.subNodes(animatic_g[0]).filter(function(item){ return node.type(item) == "READ"});
	if(anim_nodes.length != 1){
		Print("[BIRDOAPP - crate animatic movie]Invalid animatic nodes number: " + anim_nodes.length);
		Print(anim_nodes);
		return false;
	}
	return anim_nodes[0];
}	
