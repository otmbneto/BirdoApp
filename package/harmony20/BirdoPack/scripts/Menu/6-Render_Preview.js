/*V7 - adaptado para o BirdoAPP 
- deleta o compact render antes de comecar 
- cria opcao pra quando nao encontrar o quicktime no pc 
- acerta pasta local do render pelo tipo
-------------------------------------------------------------------------------
Name:		RenderPreview.js

Description:	Este Script renderiza a cena na pasta local de render do projeto

Usage:		Renderiza uma versao baixa da cena na pasta local de render

Author:		Leonardo Bazilio Bentolila

Created:	2020, (setembro 2021)
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function RenderPreview(){
	
	scene.beginUndoRedoAccum("Render Local");

	var currPath = BD2_updateUserNameInPath(scene.currentProjectPath());
	var currScene = scene.currentScene();
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}

	if(projectDATA.entity.type != "SHOT"){//checa o tipo de cena, se nao for SHOT nao roda
		MessageBox.warning("Este script somente funciona para Shot!", 0, 0);
		Print("[RENDERLOCAL] ENTITY NAO E SHOT! CANCELADO!");
		return;
	}

	if(!BD2_checkFrames()){
		return;
	}
	
	//Render Step definido baseado no user_type
	var render_step = projectDATA.getRenderStep();
	
	if(!render_step){
		Print("canceled..");
		return;
	}
	
	var prepare_render_js = projectDATA.paths.birdoPackage + "utils/prepare_for_render.js";
	
	Print("...preparing for render...");
	var output_data = require(prepare_render_js).prepare_for_render(projectDATA, render_step, render_step == "COMP", false);
	
	Print("Render output data:");
	Print(output_data);
	
	if(!output_data || output_data["render_number"] == 0){
		MessageBox.warning("Error ao settar saidas do render!",0,0);
		Print("fail to get output render data ...");
		return;				
	}
	
	//check prepare render
	var output_files = output_data["file_list"];
	if(!output_files){
		MessageBox.warning("Fail to set render nodes - 'script_prepare_for_render.js'",0,0);
		return;
	}

	//render the scene
	Action.perform("onActionComposite()");

	//check if render was ok
	var render_data = check_render_output(output_files);
		
	if(render_data.render_files.length == 0 || render_data.render_erros != 0){
		Print("the render had " + render_data.render_erros + " erros!");
		MessageBox.warning("A cena NÃO foi renderizada com sucesso! Mais info no MessageLog", 0, 0);
		return;
	}
	
	if(render_step == "COMP"){
		//checa se o servidor esta conectado nesta maquina
		if(!BD1_DirExist(BD1_dirname(output_data["render_comp"]))){
			MessageBox.warning("Cena foi renderizada no folder local, mas nao foi possivel enviar pro servidor pois este parece estar offline!",0,0);
			return;
		}
		
		if(!BD2_AskQuestion("A cena foi renderizada com sucesso!\nDeseja copiar as midias para o servidor?")){
			Print("render local com sucesso! Midias nao foram enviadas para rede!");
			return;
		}
		//copia midias para o servidor
		copy_comp_media_to_server(projectDATA, output_data["folder"], output_data["render_comp"], currScene);
		
	} else {
		copy_temprender_to_renderlocal(render_data.render_files[0], render_step);
	}
	
	Print("---render preview end!");	
	scene.endUndoRedoAccum();
	
	//undo the modifications
	Print("undoing modifications...");
	scene.undo(1);
	
//////////////////////////////////////////FUNCOES EXTRAS/////////////////////////////////////////
	function check_render_output(output_files){//verifica os arquivos de destino do render (retorna info dos arquivos de saida)
		Print("--INIT Check output files: ");
		var render_check = {"render_counter": 0, "render_erros": 0, "render_files": []};
		
		for(var i=0; i<output_files.length; i++){
			var render = output_files[i];
			if(render["render_type"] == "movie"){//se for movie
				var mov_file = output_data["folder"] + render["file_name"] + "." + render["format"];
				if(BD1_FileExists(mov_file)){
					Print("render output check: " + render["writeNode"] + " : OK!"); 
					render_check["render_counter"]++;
					render_check["render_files"].push(mov_file);
				}else{
					Print("render output check: " + render["writeNode"] + " : ERROR!"); 
					render_check["render_erros"]++;
				}
				continue;
			}
			
			if(render["render_type"] == "image"){//se for image seq
				var image_list = BD1_ListFiles(output_data["folder"] , ("*."+ render["format"]));
				
				var image_patern_name = output_data["folder"] + render["file_name"];
				//separa somente os renders de imagem deste writeNode
				var filtered_list = image_list.filter(
					function (file){
						var regex = /(\d+\.\w+)$/;//retira o 0001.ext do nome 
						var file_full_path = output_data["folder"] + file.replace(regex, "");
						return file_full_path == image_patern_name;
					}
				);
				
				//checks images exported
				filtered_list.forEach(function(x){
									var image_path = output_data["folder"] + x;
									render_check["render_files"].push(image_path);
				});
				
				if(filtered_list.length != output_data["frames_number"]){
					var images_erros_num = output_data["frames_number"] - filtered_list.length;
					Print("[ERROR]render image output check: " + render["writeNode"] + " with :" + images_erros_num + " images not rendered!"); 
					render_check["render_erros"]++;
				}else{
					Print("render image output check: " + render["writeNode"] + " : " + filtered_list.length + " imagens renderizadas!"); 
					render_check["render_counter"]++;
				}
			}
			
		}
		
		Print("Render check:");
		Print(render_check);
		
		MessageBox.information("Feito! render Log:\n -number of outputs: " + output_data["render_number"] + 
			";\n -Files Rendered: " + render_check["render_counter"] +
			";\n -Renders ERROS: " + render_check["render_erros"] +
			";\n\nMais Informacoes no MessageLog!"); 	

		return render_check;
	}
	
	function copy_comp_media_to_server(projectDATA, local_folder_render, server_render_path, scene_name){//copia as midias de comp pro server
		
		//movies render
		var movs  = BD1_ListFiles(local_folder_render, "*.mov");
		var erros_count = 0;
		
		for(var i=0; i< movs.length; i++){
			var file_name = movs[i];
			var file_path = local_folder_render + "/" + file_name;
			var dst_file = server_render_path + "/" + file_name.replace("exportFINAL", scene_name);
			if(!BD1_copy_file_with_pb(projectDATA, file_path, dst_file, "override")){
				erros_count++;	
				Print("Error copying:\n - file: " + file_path + "\nto: " + dst_file);
			}
		}
		
		MessageBox.information("As midias exportadas foram copiadas para rede!\nCom " + erros_count + " errors!");

	}
	
	function copy_temprender_to_renderlocal(temp_mov, render_step){//copia o movie temp na pasta frames de saida para o folder local de render do birdoAPP
		
		var renderLocalEp = projectDATA.getRenderPath("local", render_step);
		
		if(!renderLocalEp){
			Print("Canceled..");
			return;
		}
		
		if(!BD1_DirExist(renderLocalEp)){
			if(BD1_makeDir(renderLocalEp)){//cria pasta backup do ep se nao existir
				MessageLog.trace("Pasta: " + renderLocalEp + " criada com sucesso!");
			}
		}
		
		var local_mov = renderLocalEp + projectDATA.entity.name + ".mov";
		
		var loadingScreen = BD2_loadingBirdo(projectDATA.birdoApp, 15000, "ffmpeg_compressing_movie...");
		
		//DELETA O RENDER EXISTENTE ANTES DE COMPACTAR
		if(BD1_FileExists(local_mov)){
			BD1_RemoveFile(local_mov);
		}
		
		//Comprime movie com ffmpeg para o destino
		if(!BD1_CompressMovieFile(projectDATA.birdoApp, temp_mov, local_mov)){
			if(loadingScreen.isAlive()){
				Print("closing loading screen...");
				loadingScreen.terminate();
			}
			MessageBox.warning("ffmpeg fail to compress file: " + local_mov, 0, 0);
			return;
		}
		
		if(loadingScreen.isAlive()){
			Print("closing loading screen...");
			loadingScreen.terminate();
		}
		
		/*
		if(MessageBox.information("Shot Renderizado com sucesso! Deseja abrir o arquivo com o QuickTime?", 3, 4) == 3){
			open_with_QuickTime(local_mov);
		}
		*/

		//agora abre o explorer com o arquivo selecionado.
		var explorer =Process2("explorer.exe","/select,","\"" + local_mov.replace(/\//g, "\\") + "\"");
		MessageLog.trace(explorer.commandLine());
		explorer.launchAndDetach();

	}
	
	function open_with_QuickTime(movieFile){//abre o mov no quicktime (somente pra windows
		if(about.isMacArch()){//se for mac muda o comando
			var start = Process2("open", movieFile);
		} else if(about.isWindowsArch()){//comando para windows
			var player = choose_player();
			if(!player){
				Print("Error geting player!");
				return;
			}
			var start = Process2(BD1_doubleBackSlash_forWindows(player), BD1_doubleBackSlash_forWindows(movieFile));
		}
		start.launchAndDetach();
	}

	//Escolhe um player para abrir o arquivo no windows
	function choose_player(){
		var player_object ={"current_player": null, "other_players": []};
		var temp_folder = specialFolders.temp + "/BirdoApp/"
		
		if(!BD1_DirExist(temp_folder)){
			BD1_makeDir(temp_folder);
		}
		
		var player_json = temp_folder + "preview_player.json";
		
		if(BD1_FileExists(player_json)){
			return BD1_ReadJSONFile(player_json)["current_player"];
		}

		var programs_folder = System.getenv("ProgramW6432");
		var programs86_folder = System.getenv("ProgramFiles(x86)");
		
		if(BD1_FileExists(programs_folder + "/QuickTime/QuickTimePlayer.exe")){
			player_object["current_player"] = BD2_FormatPathOS(programs_folder + "/QuickTime/QuickTimePlayer.exe");
		} else if(BD1_FileExists(programs86_folder + "/QuickTime/QuickTimePlayer.exe")){
			player_object["current_player"] = BD2_FormatPathOS(programs86_folder + "/QuickTime/QuickTimePlayer.exe");
		} else {
			var player = FileDialog.getOpenFileName("*.exe", "escolha o exe do player que deseja usar...");
			if(!player){
				Print("escolha do player cancelada!");
				return false;
			} else {
				player_object["current_player"] = BD2_FormatPathOS(player);
			}
		}
		
		if(!BD1_WriteJsonFile(player_object, player_json)){
			Print("error writing player json file!");
			return false;
		}
		return player_object["current_player"];
	}

	
}

exports.RenderPreview = RenderPreview;
