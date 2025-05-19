include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
-------------------------------------------------------------------------------
Name:		pre_comp_render.js

Description:	Este script renderiza a cena para pre_comp (SETUP, ANIM)

Usage:		usar como require no render preview

Author:		Leonardo Bazilio Bentolila

Created:	maio, 2025;
            
Copyright:   leobazao_@Birdo

-------------------------------------------------------------------------------
*/


function pre_comp_render(proj_data){

	var temp_folder = proj_data.systemTempFolder + "/BirdoApp/export_mov";
	if(!BD1_CleanFolder(temp_folder)){
		var msg = "Falha ao limpar o folder temporário.";
		Print(msg);
		MessageBox.warning(msg, 0,0);
		return false;
	}
	
	var mov_path = scene.currentProjectPath() + "/frames/" + scene.currentScene() + ".mov";
	if(BD1_FileExists(mov_path)){
		if(!BD1_RemoveFile(mov_path)){
			var msg = "Aparentemente o arquivo de output: " + mov_path + " está aberto. Feche o arquivo antes de continuar.";
			Print(msg);
			MessageBox.warning(msg, 0,0);
			return false;
		}
	}

	//render data
	var export_data = render_options();
	if(!export_data){
		Print("Canceled...");
		return false;
	}
	Print("Export Options: ");
	Print(export_data);

	//display final
	var display_final = "Top/SETUP/_FINAL";
	if(node.getName(display_final) == ""){
		MessageBox.warning("Não foi possível encontrar o DISPLAY_FINAL para renderizar neste SETUP!",0,0);
		return false;
	}

	var counter = 0;
	var was_canceled = false;
	
	//image name path 
	var image_name = temp_folder + "/_temp_{framenumber}.png";
	var image_pattern = temp_folder + "/_temp_%04d.png";
	
	var progressDlg = new QProgressDialog("Render Preview");
	progressDlg.modal = true;
	progressDlg.setWindowFlags(Qt.FramelessWindowHint);
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
			was_canceled = true;
			return false;
		}
		Print("Script render frame: " + frame);
		progressDlg.setLabelText("Rendering frame: " + frame);
		// Save the image here.
		var frameformatnumber = ("0000" + (frame - export_data.start_frame)).slice(-4);
		var image_full_path = image_name.replace("{framenumber}", frameformatnumber);
		celImage.imageFile(image_full_path);
		progressDlg.setValue(counter);
		Print("Image rendered: " + image_full_path);
		counter++;
	}
	
	render.renderFinished.connect(renderFinished);
	render.frameReady.connect(frameReady);
	render.setRenderDisplay(display_final);
	render.setWriteEnabled(false);
	
	progressDlg.open();
	progressDlg.setLabelText("Starting render...");
	render.renderScene(export_data.start_frame, export_data.end_frame);

	render.renderFinished.disconnect(renderFinished);
	render.frameReady.disconnect(frameReady);
	
	if(!was_canceled){
		Print("converting images into movie... ");
		var audio = sound.getSoundtrack(export_data.start_frame, export_data.end_frame).path();
		Print("audio temp file created: " + audio);	
		if(!BD1_MakeMovieFromImageSeq(proj_data.birdoApp, image_pattern, scene.getFrameRate(), audio, mov_path)){
			MessageBox.warning("Error compressing images into movie!", 0,0);
			progressDlg.close();	
			return false;
		}	
	}
		
	//clean temp folder
	BD1_RemoveDirs(temp_folder);
	
	Print("MOV Export finished: " + mov_path);
	
	if(export_data.send_copy){
		progressDlg.setLabelText("Criando copia no server...");
		var mov_server = proj_data.getRenderPath("server", proj_data.user_type) + "/" + scene.currentScene() + ".mov"; 
		if(!BD1_CopyFile(mov_path, mov_server)){
			MessageBox.warning("ERROR copiando o arquivo para a rede!",0,0);
			progressDlg.close();
			return mov_path;
		}
	}
	
	//close progress bar
	progressDlg.close();

	if(export_data.open_folder){
		BD1_OpenFolder(BD1_dirname(mov_path));	
	} 
	
	if(export_data.quicktime){
		var start = Process2(BD1_doubleBackSlash_forWindows(export_data.quicktime), BD1_doubleBackSlash_forWindows(mov_path));
		start.launchAndDetach();
	}
	return mov_path;
}
exports.pre_comp_render = pre_comp_render;

//acha o caminho de instalação do quicktime
function getQuickTime(){
	var programs_folder = BD2_FormatPathOS(System.getenv("ProgramW6432") + "/QuickTime/QuickTimePlayer.exe");
	var programs86_folder =  BD2_FormatPathOS(System.getenv("ProgramFiles(x86)") + "/QuickTime/QuickTimePlayer.exe")
	if(BD1_FileExists(programs_folder)){
		return programs_folder;
	} else if(BD1_FileExists(programs86_folder)){
		return programs86_folder;
	}
	return null;
}

//define opções do render
function render_options(){
	
	var options = {};
	var d = new Dialog;
	d.title = "Render Preview";
	
	//frames
	var frames_group = new GroupBox;
	frames_group.title = "Render Frames";
	var start = new SpinBox();
	start.maximum = scene.getStopFrame()-2;
	start.minimum = scene.getStartFrame();
	start.value = 1;
	start.label = "Start: ";
	var end = new SpinBox();
	end.maximum = scene.getStopFrame();
	end.minimum = 2;
	end.value = scene.getStopFrame();
	end.label = "End: ";
	frames_group.add(start);
	frames_group.add(end);
	d.add(frames_group);
	d.addSpace(15);
	
	//send server copy
	var send_server = new CheckBox();
	send_server.text = "Enviar Uma Copia Para o Server ";
	send_server.checked = false;
	d.add(send_server);
	d.add(send_server);

	//open options
	var quicktime = getQuickTime();	
	var process_file = new CheckBox();
	process_file.checked = true;
	if(quicktime){
		process_file.text = "Abrir com QuickTime";
	} else {
		process_file.text = "Enviar Uma Copia Para o Server ";
	}
	d.add(process_file);
	d.addSpace(15);

	var rc = d.exec();
	if(!rc){
		return false;
	}
	
	options["start_frame"] = start.value;
	options["end_frame"] = end.value;
	options["send_copy"] = send_server.checked;
	options["quicktime"] = Boolean(quicktime) ? (process_file.checked ? quicktime : false) : false;
	options["open_folder"] = Boolean(quicktime) ? false : process_file.checked ;
	return options;
}