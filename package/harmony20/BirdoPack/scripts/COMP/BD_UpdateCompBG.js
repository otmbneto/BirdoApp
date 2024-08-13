include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_UpdateCompBG(){
	
	//scene name
	var curr_scene = scene.currentScene();
	var ep = curr_scene.split("_")[1];
	
	
	var projData = BD2_ProjectInfo();

	if(!projData){
		MessageBox.information("Erro ao pegar info do projeto!");
		return;
	}
	
	var server_bgs_folder = [projData.getServerRoot()+ projData.paths.episodes + ep, "02_ASSETS", "01_BG", "02_POST_BOARD", "07_FECHAMENTO", "02_COMP"].join("/");
	if(!BD1_DirExist(server_bgs_folder)){
		MessageBox.warning("Nenhum folder de bg de fechamento da comp encontrado! Avise a direção tecnica!",0,0);
		return;
	}
	
	var server_psds = BD1_ListFiles(server_bgs_folder, curr_scene + "*.psd");
	var comp_psd = server_bgs_folder + "/" + server_psds[server_psds.length - 1];
	
	if(!comp_psd){
		MessageBox.warning("Error finding server psd for scene!", 0, 0);
		return;
	}
	
	//test if has valid selected file
	var sel = selection.selectedNode(0);
	var elementId = node.getElementId(sel);
	var element_folder = element.completeFolder(elementId);
	if(!element_folder){
		MessageBox.warning("No Element folder found for selected Node!", 0, 0);
		return;
	}
	
	var scene_psd = BD1_ListFiles(element_folder, curr_scene + "*.psd")[0];
	if(!scene_psd){
		MessageBox.warning("No PSD found for selected Node!", 0, 0);
		return;
	}
	scene_psd = element_folder + "/" + scene_psd;
	Print("Coping psd files...");
	if(!BD1_copy_file_with_pb(projData, comp_psd, scene_psd)){
		MessageBox.warning("ERROR copying files!",0,0);
		return;
	}
	
	var msg = "Scene Background updated!";
	Print(msg);
	MessageBox.information(msg);
}