include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function render_file(self, projData, export_config, config_json){
	
	Print("Exporting asset..");
	//display node selected
	var display_selected = export_config.display.nodes[export_config.display.names.indexOf(export_config.display.last)];
	
	if(!display_selected){
		MessageBox.warning("Nenhum display selecionado!",0,0);
		return false;
	}
	
	//file name
	var file_name_path = export_config.folder + "/" + export_config.file_name;

	//temp folder 
	var temp_folder = [projData.systemTempFolder, "BirdoApp", "_renderTemp"].join("/");
	if(!BD1_CleanFolder(temp_folder)){
		Print("fail to clean temp folder!");
		return false;
	}
	
	scene.beginUndoRedoAccum("Export Asset");
	//update layers filters
	for(item in export_config.layers.filters){
		if(export_config["layers"]["filters"][item]){
			var visibility_node = export_config["layers"]["filters"][item]["node"];
			node.setEnable(visibility_node, true);
			node.setTextAttr(visibility_node, "SOFTRENDER", 1, export_config["layers"]["filters"][item]["checked"]);
		}
	}
	self.ui.hide();
	
	//create progressBar
	var prgssBar = new QProgressDialog(self);
	prgssBar.autoClose = false;
	
	//final message text
	var final_msg = "";
	
	//export images
	if(export_config.output == "images"){
		var res = {"x": export_config.size.x, "y": export_config.size.y};
		var rendered_images = exportImages(prgssBar, file_name_path, export_config.formats.selected, export_config.end_frame, export_config.start_frame, res);
		if(!rendered_images){
			Print("error rendering images");
			return false;
		}
		Print("Rendered Images: ");
		Print(rendered_images);
		final_msg = "Imagens renderizadas: " + rendered_images.length;
	
	//export movie
	} else if(export_config.output == "movie"){
		scene.setFrameRate(export_config.fps);
		var rendered_movie = exportMov(prgssBar, export_config);
		if(!rendered_movie){
			Print("error rendering movie");
			return false;
		}
		final_msg = "Movie renderizado: " + rendered_movie;
	
	//export GIF
	} else if(export_config.output == "gif"){
		var rendered_gif = exportGIF(prgssBar, export_config);
		if(!rendered_gif){
			Print("error rendering gif");
			return false;
		}
		final_msg = "GIF renderizado: " + rendered_gif;
		Print("GIF rendered: " + rendered_gif);
	}
	scene.endUndoRedoAccum();
	
	//closes progress bar dialog
	prgssBar.close();
	
	//update config json 
	BD1_WriteJsonFile(export_config, config_json);
	
	//final message
	MessageBox.information(final_msg);
	
	//open output folder:
	if(export_config.open_folder){
		Print("Opening output folder...");
		if(!BD1_OpenFolder(export_config.folder)){
			Print("--Error opening output folder!");
		}	
	}
	
	Print("Export ASSET end!");
	return true;

	//EXTRA FUNCTIONS
	//exports image sequence function
	function exportImages(progressDlg, root_name, format, end_frame, start_frame, resolution){
	
		var imageList = [];
		var counter = 0;
		
		//image name path 
		var image_name = root_name + "_{framenumber}." + format;
				
		progressDlg.modal = true;
		progressDlg.setRange(0, (end_frame - start_frame) + 1);

		var renderFinished = function (){
			Print("Render Finished with " + (counter - 1) + " images!");
		}

		var frameReady = function(frame, celImage){
			if(progressDlg.wasCanceled){
				render.cancelRender();
				Print("canceled at frame " + frame);
				MessageBox.information("Export Canceled!");
				return null;
			}
			Print("Script render frame: " + frame);
			progressDlg.setLabelText("Rendering frame: " + frame);
			// Save the image here.
			var frameformatnumber = ("0000" + (frame - start_frame)).slice(-4);
			var image_full_path = image_name.replace("{framenumber}", frameformatnumber);
			celImage.imageFile(image_full_path);
			progressDlg.setValue(counter);
			Print("Image rendered: " + image_full_path);
			imageList.push(image_full_path);
			counter++;
		}
		
		render.setRenderDisplay(display_selected);
		render.setWriteEnabled(false);
		if(resolution){
			render.setResolution(resolution.x, resolution.y);
		}
		//connect callbacks
		render.renderFinished.connect(renderFinished);
		render.frameReady.connect(frameReady);
		
		progressDlg.open();
		progressDlg.setLabelText("Starting render...");
		render.renderScene(start_frame, end_frame);

		render.renderFinished.disconnect(renderFinished);
		render.frameReady.disconnect(frameReady);
		return imageList;
	}
	
	//export GIF function
	function exportGIF(progressBar, export_data){
	
		//export temporary images frames
		var temp_img_names = temp_folder + "/temp";
		var temp_pattern = temp_img_names + "_%04d.png";
		Print("exporting frames...");
		var temp_images = exportImages(progressBar, temp_img_names, "png", export_data.end_frame, export_data.start_frame, null);
		if(!temp_images){
			MessageBox.warning("Erro exportando frames!", 0, 0);
			return null;
		}
		
		//final gif file
		var gif_path = file_name_path + ".gif";
		Print("exporting gif: " + gif_path);
		progressBar.reset();
		progressBar.setLabelText("Creating GIF...");
		
		if(!BD1_CreateGIF(projData.birdoApp, temp_pattern, export_data.fps, export_data.size.x, export_data.size.y, gif_path)){
			MessageBox.warning("ERRO ao gerar GIF!", 0, 0);
			return null;
		}
		
		Print("Gif Export end");
		return gif_path;
	}
	
	//export movie funcition
	function exportMov(progressBar, export_data){
		
		//export temporary images frames
		var temp_img_names = temp_folder + "/temp";
		var temp_pattern = temp_img_names + "_%04d.png";
		Print("exporting frames...");
		var temp_images = exportImages(progressBar, temp_img_names, "png", export_data.end_frame, export_data.start_frame, null);
		if(!temp_images){
			MessageBox.warning("Erro exportando frames!", 0, 0);
			return null;
		}
		
		//final movie name
		var mov_path = file_name_path + ".mov";
		Print("exporting mov: " + mov_path);
	
		progressBar.setLabelText("Creating Movie...");
		Print("converting images into movie... ");
		if(!BD1_MakeMovieFromImageSeq(projData.birdoApp, temp_pattern, export_data.fps, "null", mov_path)){
			MessageBox.warning("Error compressing images into movie!", 0,0);
			return null;
		}	
		
		//clean temp folder
		BD1_RemoveDirs(temp_folder);
		
		Print("Movie Export ended!");
		return mov_path;
	}
	
}
exports.render_file = render_file;
