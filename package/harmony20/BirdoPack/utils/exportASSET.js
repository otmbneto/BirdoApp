include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function exportASSET(self, export_config, config_json){
	
	Print("Exporting asset..");
	
	//display node selected
	var display_selected = export_config.display.nodes[export_config.display.names.indexOf(export_config.display.last)];
	
	//file name
	var file_name_path = export_config.folder + "/" + export_config.file_name;

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

	if(export_config.output == "images"){
		var rendered_images = exportImages(self, export_config);
		if(!rendered_images){
			Print("error rendering images");
			return false;
		}
		Print("Images rendered: ");
		Print(rendered_images);
	} else {
		scene.setFrameRate(export_config.fps);
		if(export_config.output == "gif"){
			var rendered_gif = exportGIF(export_config);
			if(!rendered_gif){
				Print("error rendering gif");
				return false;
			}
			Print("GIF rendered: " + rendered_gif);
		}
		if(export_config.output == "movie"){
			var rendered_movie = exportMov(export_config);
			if(!rendered_movie){
				Print("error rendering movie");
				return false;
			}
			Print("Movie rendered: " + rendered_movie);
		}
	}
	scene.endUndoRedoAccum();
	
	//update config json 
	BD1_WriteJsonFile(export_config, config_json);
	
	//open output folder:
	if(export_config.open_folder){
		Print("Opening output folder...");
		if(!BD1_OpenFolder(export_config.folder)){
			Print("--Error opening output folder!");
		}	
	}
	return true;

	//EXTRA FUNCTIONS
	function exportGIF(export_data){//exports gif image
		var gif_path = file_name_path + ".gif";
		Print("exporting gif: " + gif_path);
		
		try{
			var res = exporter.exportGIF({ fileName : gif_path,
										 displayName : export_data.display.last,
										 startFame : export_data.start_frame,
										 stopFrame : export_data.end_frame,
										 resX : scene.currentResolutionX(),
										 resY : scene.currentResolutionY(),
										 dith : exporter.None,
										 loop : true});
		  
			if(res){
				MessageBox.information("The GIF export has succeeded");
			} else {
				MessageBox.information("The GIF export has failed");
				Print("Error exporting GIF");
				return false;
			}
		} catch (err){
			MessageBox.critical(err.message);
			return false;
		}
		Print("Gif Export end");
		return gif_path;
	}
	
	function exportMov(export_data){
		
		var mov_path = file_name_path + ".mov";
		Print("exporting mov: " + mov_path);
		
		try{
			var res = exporter.exportToQuicktime(
									export_data.display.last,
									export_data.start_frame, 
									export_data.end_frame,
									false,
									scene.currentResolutionX(),
									scene.currentResolutionY(),
									mov_path,
									display_selected,
									false,
									1);
			if(res){
				MessageBox.information("MOV export has succeeded");
			} else {
				MessageBox.information("MOV export has failed");
				Print("Error exporting MOV");
				return false;
			}
		} catch (err){
			MessageBox.critical(err.message);
			return false;
		}
		Print("MOV Export end");
		return mov_path;
	}
	
	function exportImages(self, export_data){//exports image sequence
	
		var imageList = [];		
		var counter = 0;
		
		//image name path 
		var image_name = file_name_path + "_{framenumber}." + export_data.formats.selected;

		var progressDlg = new QProgressDialog(self);
		progressDlg.modal = true;
		progressDlg.setRange(0, export_data.end_frame - export_data.start_frame);

		var renderFinished = function (){
			var msg = "Render Finished with " + counter + " images!";
			progressDlg.close();
			MessageBox.information(msg);
			Print(msg);
		}

		var frameReady = function(frame, celImage){
			if(progressDlg.wasCanceled){
				render.cancelRender();
				progressDlg.close();
				Print("canceled at frame " + frame);
				MessageBox.information("Export Canceled!");
			}
			Print("Script render frame: " + frame);
			progressDlg.setLabelText("Rendering frame: " + frame);
			// Save the image here.
			var frameformatnumber = ("0000" + frame).slice(-4);
			var image_full_path = image_name.replace("{framenumber}", frameformatnumber);
			celImage.imageFile(image_full_path);
			progressDlg.setValue(counter);
			Print("Image rendered: " + image_full_path);
			imageList.push(image_full_path);
			counter++;
		}
		
		render.renderFinished.connect(renderFinished);
		render.frameReady.connect(frameReady);
		render.setRenderDisplay(display_selected);
		render.setWriteEnabled(false);
		
		progressDlg.open();
		render.renderScene(export_data.start_frame, export_data.end_frame);

		render.renderFinished.disconnect(renderFinished);
		render.frameReady.disconnect(frameReady);

		return imageList;
	}		
}

exports.exportASSET = exportASSET;
