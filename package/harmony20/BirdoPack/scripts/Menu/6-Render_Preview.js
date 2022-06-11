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
	
	if(render_step == "COMP"){
		//renderiza direto no server...
		Print("step is COMP, preparing for render...");
		
		var output_data = require(prepare_render_js).prepare_for_render(projectDATA, "COMP", true);
		
		if(!output_data || output_data["render_number"] == 0){
			MessageBox.warning("Error ao settar saidas do render para COMP!",0,0);
			Print("fail to get output data for comp");
			return;				
		}
		
		Action.perform("onActionComposite()");

		//chek saida se rolou os renders
		var output_files = output_data["file_list"];
		
		if(!output_files){
			MessageBox.warning("Fail to set render nodes - 'script_prepare_for_render.js'",0,0);
			return;
		}

		var render_counter = 0;
		var render_erros = 0;
		for(var i=0; i<output_files.length; i++){
			var render = output_files[i];
			
			if(render["render_type"] == "movie"){//se for movie
				var mov_file = output_data["folder"] + render["file_name"] + "." + render["format"];
				if(BD1_FileExists(mov_file)){
					Print("render output check: " + render["writeNode"] + " : OK!"); 
					render_counter++;
				}else{
					Print("render output check: " + render["writeNode"] + " : ERROR!"); 
					render_erros++;
				}
			}
			
			if(render["render_type"] == "image"){//se for image seq
				var image_list = BD1_ListFiles(output_data["folder"] , ("*."+ render["format"]));
				
				if(image_list.length == 0){
					Print("Image sequence render failed!");
					MessageBox.warning("A cena NÃO foi renderizada!",0,0);
					return false;
				}
				
				var image_patern_name = output_data["folder"] + render["file_name"];
				//separa somente os renders de imagem deste writeNode
				var filtered_list = image_list.filter(
					function (file){
						var regex = /(\d+\.\w+)$/;//retira o 0001.ext do nome 
						var file_full_path = output_data["folder"] + file.replace(regex, "");
						return file_full_path == image_patern_name;
					}
				);
				
				
				if(filtered_list.length > 0){
					Print("render image output check: " + render["writeNode"] + " : " + filtered_list.length + " imagens renderizadas!"); 
					render_counter++;
				}else{
					Print("render image output check: " + render["writeNode"] + " : ERROR!"); 
					render_erros++;
				}
			}
			
		}
		
		MessageBox.information("Feito! render Log:\n -number of outputs: " + 
			output_data["render_number"] + 
			";\n -Renders OK: " + render_counter +
			";\n -Renders ERROS: " + render_erros +
			";\n\nMais Informacoes no MessageLog!"); 
	} else{
		//renderiza no local da pessoa
		Print("step is PRE_COMP, will render in local folder...");
		
		var output_data = require(prepare_render_js).prepare_for_render(projectDATA, "PRE_COMP", false);
		
		if(!output_data || output_data["render_number"] == 0){
			MessageBox.warning("Erro ao settar saidas do render para PRE_COMP!",0,0);
			Print("fail to get output data for PRE_COMP");
			return;
		}
		
		Action.perform("onActionComposite()");
		
		//chek saida se rolou o render
		var output_files = output_data["file_list"];
		var render = output_files[0];
		
		if(render["render_type"] != "movie"){//garante q o render saiu em movie
			Print("Algo deu errado! Output de pre_comp diferente de movie! Nao foi possivel verificar saida do render!");
			return;
		}
		
		var mov_file = output_data["folder"] + render["file_name"] + "." + render["format"];
		Print("mov file rendered path: " + mov_file);
		if(!BD1_FileExists(mov_file)){
			MessageBox.information("A cena NÃO foi renderizada!");
			scene.cancelUndoRedoAccum();
			return;
		}
		
		copy_temprender_to_renderlocal(mov_file, render_step);
		
	}
	
	
	scene.endUndoRedoAccum();
//////////////////////////////////////////FUNCOES EXTRAS/////////////////////////////////////////

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
		
		if(MessageBox.information("Shot Renderizado com sucesso! Deseja abrir o arquivo com o QuickTime?", 3, 4) == 3){
			open_with_QuickTime(local_mov);
		}

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
