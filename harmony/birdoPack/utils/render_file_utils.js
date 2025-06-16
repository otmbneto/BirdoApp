include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function render_file(self, projData, export_config, config_json){
	
	Print("Exporting asset..");
	//display node selected
	var display_selected = export_config.display.nodes[export_config.display.names.indexOf(export_config.display.last)];
	
	//file name
	var file_name_path = export_config.folder + "/" + export_config.file_name;

	//temp folder 
	var temp_folder = [projData.systemTempFolder, "BirdoApp", "_renderTemp"].join("/");
	
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
		if(rendered_images == "RENDERED_PNG"){
			Print("PNG4 sequence rendered!");
			MessageBox.information("PNGs renderizados!");
			return true;
		}
		if(!rendered_images){
			Print("error rendering images");
			return false;
		}
		Print("Images rendered: ");
		Print(rendered_images);
		MessageBox.information("Rendered images: " + rendered_images.length);
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
			var rendered_movie = exportMov(self, export_config);
			if(!rendered_movie){
				Print("error rendering movie");
				return false;
			}
			MessageBox.information("Movie rendered: " + rendered_movie);
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
	
	Print("Export ASSET end!");
	return true;

	//EXTRA FUNCTIONS
	function exportGIF(export_data){//exports gif image
		var gif_path = file_name_path + ".gif";
		Print("exporting gif: " + gif_path);
		try{
			var res = exporter.exportGIF({ fileName : gif_path,
										 displayName : export_data.display.last,
										 startFame : parseInt(export_data.start_frame),
										 stopFrame : parseInt(export_data.end_frame),
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
	
	function exportMov(self, export_data){
		var mov_path = file_name_path + ".mov";
		Print("exporting mov: " + mov_path);
		
		if(!BD1_CleanFolder(temp_folder)){
			Print("fail to clean temp folder!");
			return false;
		}
		
		var counter = 0;
		var canceled = false;
		
		//image name path 
		var image_name = temp_folder + "/_temp_{framenumber}.png";
		var image_pattern = temp_folder + "/_temp_%04d.png";
		
		var progressDlg = new QProgressDialog(self);
		progressDlg.modal = true;
		progressDlg.setRange(0, (export_data.end_frame - export_data.start_frame) + 1);

		var renderFinished = function (){
			Print("Render Finished with " + counter + " temp images!");
			progressDlg.setLabelText("Converting images to movie...");
		}

		var frameReady = function(frame, celImage){
			if(progressDlg.wasCanceled){
				render.cancelRender();
				progressDlg.close();
				Print("canceled at frame " + frame);
				MessageBox.information("Export Canceled!");
				canceled = true;
				return false;
			}
			Print("Script render frame: " + frame);
			progressDlg.setLabelText("Rendering frame: " + frame);
			// Save the image here.
			var frameformatnumber = ("0000" + frame).slice(-4);
			var image_full_path = image_name.replace("{framenumber}", frameformatnumber);
			celImage.imageFile(image_full_path);
			progressDlg.setValue(counter);
			Print("Image rendered: " + image_full_path);
			counter++;
		}
		
		render.renderFinished.connect(renderFinished);
		render.frameReady.connect(frameReady);
		render.setRenderDisplay(display_selected);
		render.setWriteEnabled(false);
		
		progressDlg.open();
		progressDlg.setLabelText("Starting render...");
		render.renderScene(export_data.start_frame, export_data.end_frame);

		render.renderFinished.disconnect(renderFinished);
		render.frameReady.disconnect(frameReady);
		
		if(!canceled){
			Print("converting images into movie... ");
			if(!BD1_MakeMovieFromImageSeq(projData.birdoApp, image_pattern, export_data.fps, "null", mov_path)){
				MessageBox.warning("Error compressing images into movie!", 0,0);
				progressDlg.close();	
				return false;
			}	
		}
		progressDlg.close();
		
		//clean temp folder
		BD1_RemoveDirs(temp_folder);
		Print("MOV Export end");
		return mov_path;
	}
	
	function exportImages(self, export_data){//exports image sequence
	
		var imageList = [];		
		var counter = 0;
		
		//image name path 
		var format = export_data.formats.selected;
		var image_name = file_name_path + "_{framenumber}." + format;
		
		if(format == "png"){
			image_name = image_name.replace("{framenumber}.", "");
			var writeN = get_write_node(display_selected);
			if(writeN){
				set_image_write_node_to_png(writeN, image_name);
				
				//render the scene
				Action.perform("onActionComposite()");
				return "RENDERED_PNG";
				
			} else {
				MessageBox.warning("Nao foi encontrado um writeNode para o display selecionado! Nao será possível exportar com transparencia!",0,0);
			}
		}
		
		var progressDlg = new QProgressDialog(self);
		progressDlg.modal = true;
		progressDlg.setRange(0, (export_data.end_frame - export_data.start_frame) + 1);

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
		progressDlg.setLabelText("Starting render...");
		render.renderScene(export_data.start_frame, export_data.end_frame);

		render.renderFinished.disconnect(renderFinished);
		render.frameReady.disconnect(frameReady);
		return imageList;
	}		
	
	function set_image_write_node_to_png(write_node, drawing_name){//modifica o write node para exportar PNG4 
		node.setTextAttr(write_node, "EXPORT_TO_MOVIE", 1, "Output Drawings");
		node.setTextAttr(write_node, "DRAWING_NAME", 1, drawing_name);
		node.setTextAttr(write_node, "DRAWING_TYPE", 1, "PNG4");
	}
	
	function get_write_node(display_node){//retorna o write do display
		var nodeConnected = node.srcNode(display_node,0);
		var links = node.numberOfOutputLinks(nodeConnected, 0);	
		for(var i=0; i<links; i++){
			var n = node.dstNode(nodeConnected, 0, i);
			if(node.type(n) == "WRITE"){
				return n;
			}
		}
		return false;
	}
}
exports.render_file = render_file;
