include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


//runs batch
BAT_CompactScene();


function BAT_CompactScene(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	
	try{
		var compact_func = require(projectDATA.paths.birdoPackage + "utils/compact_version.js");
		var nodes_data = compact_func.create_compact_file_list(false);
		var nodes_data = compact_func.create_compact_file_list(false);
		var allfiles = BD1_ListFolderRecursivelly(scene.currentProjectPath())
		var used_nodes_list = nodes_data["file_list"].map(function(item){ return item["full_path"]});
		var delete_list = allfiles.filter(function(item){ return used_nodes_list.indexOf(item) == -1});
		Print(delete_list);
		Print("delete list: " + delete_list.length);
		Print("used list: " + used_nodes_list.length);
	}catch(e){
		Print(e);
	}
	Print("END BATCH UPDATE SETUP!");
}