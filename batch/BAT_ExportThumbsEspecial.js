include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* OBS: nao usa interface de progressBar
-------------------------------------------------------------------------------
Name:		BAT_ExportThumbsEspecial.js

Description:	Script para renderizar os thumbnails do tpl (somente usar em tpls)

Usage:		Bat para modificar a cena e gerar os thumbnails (rodar compile com flag -readOnly);

Author:		Leonardo Bazilio Bentolila

Created:	março, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
//call function
BAT_ExportThumbsEspecial();
create_tpl_metadata();

function save_metadata_to_JSON(assetInfo){//salva json com metadata do tpl salvo
	var jsonFile = scene.currentProjectPath() + "/saveTPL.JSON";
	var metadata = {"user": about.getUserName(),
					"info" : assetInfo,
					"original_file" : scene.currentProjectPath() + "/" + scene.currentVersionName() + ".xstage",
					"date" : new Date(),
					"toon_boom_version" : about.getVersionInfoStr()
					};
	BD1_WriteJsonFile(metadata, jsonFile);
}

function create_tpl_metadata(){

	var scene_name = scene.currentScene().split(".")[0];
	var assetInfo = {
    	"code": scene_name,
    	"type": "Asset",
    	"id": "-1",
    	"shots": [],
    	"sg_version_template": scene_name
  	}
  	save_metadata_to_JSON(assetInfo);
}

function BAT_ExportThumbsEspecial(){
	
	Print("Start script ...");
	
	//set scene to render (create display and connect composite to group outputs
	var display = prepareScene();
	
	if(!display){
		Print("canceling...");
		return;
	}
	
	var thumbsFolder = scene.currentProjectPath() + "/.thumbnails"; 
	
	//clean thumbnails folder
	BD1_CleanFolder(thumbsFolder);
	
	exportThumbs(thumbsFolder, display);
	
	//extra functions
	function prepareScene(){
		var allNodes = node.subNodes(node.root());
		var comp = node.add(node.root(), "Composite", "COMPOSITE", 0, 100, 0);
		var ready = false;
		allNodes.forEach(function(n){
			for(var i =0; i<node.numberOfOutputPorts(n); i++){
				if(!node.dstNode(n, i, 0)){
					node.link(n, i, comp, node.numberOfInputPorts(comp));
					ready = true;
				}
			}
			
		});
		
		//se nao tiver conectado nenhum node na comp
		if(!ready){
			Print("scene is not ready to render thumbs... ");
			return false;
		}
		
		var display = node.add(node.root(), "RENDER_DISPLAY", "DISPLAY", 0, 200, 0);
		node.link(comp, 0, display, 0);
		
		return display;
	}
	
	function exportThumbs(thumsbFolder, display){//render thumbnails
		Print("exporting thumbs...");
		var counter = 0;
		//image name path
		var image_name = thumsbFolder + "/t-{framenumber}.png";

		var renderFinished = function (){
			Print("Render Finished with " + counter + " temp images!");
		}
		var frameReady = function(frame, celImage){
			Print("Script render frame: " + frame);
			// Save the image here.
			var frameformatnumber = ("0000" + frame).slice(-4);
			var image_full_path = image_name.replace("{framenumber}", frameformatnumber);
			celImage.imageFile(image_full_path);
			Print("Image rendered: " + image_full_path);
			counter++;
		}
		
		render.renderFinished.connect(renderFinished);
		render.frameReady.connect(frameReady);
		render.setRenderDisplay(display);
		render.setWriteEnabled(false);
		render.setAutoThumbnailCropping(true);
		render.setResolution(320, 240);
		render.setWhiteBackground(true);
		//render scene
		render.renderSceneAll();

		render.renderFinished.disconnect(renderFinished);
		render.frameReady.disconnect(frameReady);
		
		Print("thumbs export ended!");
		return true;
	}
}