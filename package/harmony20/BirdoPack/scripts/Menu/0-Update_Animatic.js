/*
	Funcao teste para o package

	TODO: finalizar funcao q chama o python (pegar exemplo do outro script)
	      verificar progressBars
		  testar numa cena (simular mov v03 em alguma cena so pra ver se puxa)

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function UpdateAnimatic(){

	var projectDATA = BD2_ProjectInfo();
	
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	if(projectDATA["entity"]["type"] != "SHOT"){
		MessageBox.information("Este script somente funciona para SHOTS!");
		return;
	}
	
	var update_animatic = false;
	
	scene.beginUndoRedoAccum("Update Animatic");
	
	var extension = "png";//extencao da seq imagem a ser convertida do movie

	var animaticPath = "Top/ANIMATIC_";
	var portIn = animaticPath + "/Multi-Port-In";
	var comp = getGroupComposite(animaticPath, 0);
	if(!comp){
		MessageBox.warning("ERRO! Nao foi encontrada a comp de animatic para efetuar atualização!");
		return;
	}
	var old_animatic = getAnimaticNode(animaticPath);
	var animatic_version = getCurretnAnimaticVersion(old_animatic);

	if(old_animatic == "abort"){
		scene.cancelUndoRedoAccum();
		return;
	}
	
	if(node.getName(animaticPath) == ""){
		Print("Grupo do animatic nao encontrado!");
		scene.cancelUndoRedoAccum();
		return false;
	}
	
	if(node.getName(old_animatic) != ""){//checa se ja existe um animatic na cena
		update_animatic = true;
	} else {
		animatic_version = "v00";
	}
	
	var temp_movie_file = getAnimaticMovie(projectDATA, animatic_version);
	
	if(!temp_movie_file){
		scene.cancelUndoRedoAccum();		
		return;
	}
	
	if(!BD1_FileExists(temp_movie_file["mov_path"])){
		Print("Erro: Animatic nao encontrado!");
		scene.cancelUndoRedoAccum();
		return;
	}
	
	var loadingScreen = BD2_loadingBirdo(projectDATA.birdoApp, 15000, "processing_movie...");

	var compressed_movie = compressMovie(projectDATA, temp_movie_file["mov_path"]);

	if(!compressed_movie){
		MessageBox.warning("[ERROR] Compressing mov file!", 0, 0);
		Print("error compressing movie!");
		loadingScreen.terminate();
		scene.cancelUndoRedoAccum();		
		return;
	}

	var temp_folder = convert_movie_to_image_seq(projectDATA, compressed_movie, extension);// cretae temp folder with files

	if(!temp_folder){
		MessageBox.warning("[ERROR] Converting mov to image sequence!!!", 0, 0);
		loadingScreen.terminate();
		scene.cancelUndoRedoAccum();
		return;
	}
	
	if(loadingScreen.isAlive()){
		Print("closing loading screen...");
		loadingScreen.terminate();
	}

	var up = updateAudio(temp_folder["audio_file"]);//deleta os audios da cena
	if(!up){
		scene.cancelUndoRedoAccum();
		Print("falha ao criar o audio para a cena!");
		MessageBox.warning("[ERROR] Creating Audio layer!!!", 0, 0);
	}
	
	if(update_animatic){//se ja existir um animatic na cena, deleta
		deleteOldAnimatic(old_animatic);
	}

	var animatic = create_animatic_node(temp_folder["image_folder"], extension, animaticPath, temp_movie_file["new_version"]);

	if(node.getName(animatic) == "" || !animatic){
		scene.cancelUndoRedoAccum();
		Print("[ERROR] creating animatic node!!");
		MessageBox.warning("[ERROR] creating animatic node!", 0, 0);
	} else {
		node.link(animatic, 0, comp, 0);
		node.link(portIn, 0, animatic, 0, false, false);
		node.setTextAttr(animatic, "OFFSET.X", 1, -4);
		node.setLocked(animatic, true);
		MessageBox.information("Animatic importado com sucesso!");
		Print("Animatic Importado com sucesso! Confira a duracao na timeline!");
	}
	
	//Limpando sujeira de arquivos temporarios...
	cleanCache(projectDATA);
	BD1_RemoveFile(temp_movie_file["mov_path"]);

	scene.endUndoRedoAccum();

	////////////FUNCOES EXTRAS////////////////////////
	function getGroupComposite(group, port){
		
		var multiout = node.getGroupOutputModule(group, "Multi-Port-Out", 0,0,0);
		var next = node.srcNode(multiout, port);
		while(next != ""){
			if(node.type(next) == "COMPOSITE"){
				return next;
			}
			next = node.srcNode(next, port);
		}
		return null;
	}
	
	function getCurretnAnimaticVersion(animatic_node){//pega a versao do animatic atual da cena atraves do node de animatic
			
		var version = "v00";
		var version_regex = /v\d{2}/;
		
		if(version_regex.test(node.getName(animatic_node))){
			version = version_regex.exec(node.getName(animatic_node))[0]
		}
		
		return version;
	}
	
	function deleteOldAnimatic(animaticPath){//deleta o animatic antigo e seus audios!
		var del = node.deleteNode(animaticPath, true, true);
		Print("animatic deleted: " + del);
		return del;
	}

	function getAnimaticNode(animGroup){//verifica se ha algum animatic na cena e retorna ele
		var subs = node.subNodes(animGroup);
		var listRead = [];
		for(var i=0; i<subs.length; i++){
			if(node.type(subs[i]) == "READ"){
				listRead.push(subs[i]);
			}			
		}
		if(listRead.length >1){
			Print("Esta cena contem mais de um animatic dentro do grupo 'ANIMATIC_'! Delete os animatics antigos na mao antes de importar o Animatic novo!");
			return "abort";
		} else {
			return listRead[0];
		}
	}

	function create_animatic_node(image_folder, extension, parent, animatic_version){//cria um node de animatic com a sequencia de imagens convertidas

		if(parent === undefined){
			parent = node.root();
		}

		var name = "Animatic_" + animatic_version;
		var elemId = element.add(name, "COLOR", scene.numberOfUnitsZ(), extension.toUpperCase(), 0);
		if(elemId == -1){
			Print("falha ao criar elemento!");
			return null; // no read to add.
		}

		var uniqueColumnName = BD2_getUniqueColumnName(name);
		column.add(uniqueColumnName , "DRAWING");
		column.setElementIdOfDrawing( uniqueColumnName, elemId );

		var read = node.add(parent, name, "READ", 0, 0, 0);
		
		node.linkAttr(read, "DRAWING.ELEMENT", uniqueColumnName);

		var image_list =  BD1_ListFiles(image_folder, "*.png");

		var image_count = image_list.length;

		if(image_count == 0){
			Print("Falha ao encontrar imagens png!");
			return false;
		}
		
		var sceneFrameNumber = frame.numberOf();
		
		if(sceneFrameNumber < image_count){
			Print("frames adicionados: " + (image_count - sceneFrameNumber));
			frame.insert(sceneFrameNumber, (image_count - sceneFrameNumber));
		}
		
		
		var progressDlg = new QProgressDialog();
		progressDlg.setStyleSheet(progressDlg_style);
		progressDlg.modal = true;
		progressDlg.open();
		progressDlg.setRange(0, (image_count - 1));
		
		for(var i = 0; i <image_count; i++){
			var timing = (1+i).toString();
			progressDlg.setLabelText("Importing Animatic frame: [" + timing + "/" + image_count + "]");
			progressDlg.setValue(i);
			var image_path = image_folder + image_list[i]; 
			Print("importing image: " + image_path);
			Drawing.create(elemId, timing, true); // create a drawing drawing, 'true' indicate that the file exists.
			var drawingFilePath = Drawing.filename(elemId, timing);   // get the actual path, in tmp folder.

			BD1_CopyFile( image_path, drawingFilePath );
			column.setEntry(uniqueColumnName, 1, timing, timing);
		}
		progressDlg.hide();
		return read; // name of the new drawing layer.
	}

	function updateAudio(audio_file){//deleta as colunas e arquivos de audio da cena e importa o novo
		var scene_audio_folder = BD2_updateUserNameInPath(scene.currentProjectPath()) + "/audio/";
		var sounds_columns = column.getColumnListOfType("SOUND");
		
		if(!BD1_FileExists(audio_file)){
			Print("error loading audio file: " + audio_file);
			MessageBox.warning("Error loading WAV audio file from scene!");
			return false;
		}
		
		//deleta os audios existentes na cena
		if(sounds_columns.length > 0){
			var sounds_deleted = 0;
			for(var i=0; i<sounds_columns.length;i++){
				var soundFile = scene_audio_folder + column.getEntry(sounds_columns[i], 1, 1);
				Print("deleting sound file.. " + soundFile);
				column.removeSoundColumn(sounds_columns[i]);
				sounds_deleted++;
			}
			Print("audios deletados na cena: " + sounds_deleted);
		}
		
		var column_name = BD2_getUniqueColumnName("Animatic_audio");
		var audio_import = BD1_Import_sound(audio_file, column_name);
		Print("audio import " + column_name + " : " + audio_import);
		return audio_import;

	}

	function cleanCache(projectData){//limpa os folders de import animatic q ainda existem no temp folder

		var temp_folder = projectData.systemTempFolder;
		var regex_columName = /(ATV-\w{16})$/;// regex pra achar os nomes de coluna criado e ficaram de sujeira do importAnimatic do Shotgun
		var list_folders = BD1_ListFolders(temp_folder);
		var count = 0;

		for(var i=0; i<list_folders.length; i++){
			if(regex_columName.test(list_folders[i])){
				var to_delete = temp_folder + "/" + list_folders[i];
				Print("trash found: " + list_folders[i]);
				if(BD1_RemoveDirs(to_delete)){
					count++;
				}
			}
		}
		Print("Cache limpo!! " + count + " pastas foram deletadas!");
	}

	function compressMovie(projData, tempMovie){//compress do movie do animatic com ffmpeg para ficar menor o arquivo! (retorna caminho do render novo comprimido)
		
		var render_local_animatic_folder = projData.getRenderAnimaticLocalFolder();
		
		if(!BD1_DirExist(render_local_animatic_folder)){
			BD1_createDirectoryREDE(render_local_animatic_folder);
		}
		
		var local_animatic_file = render_local_animatic_folder + BD1_fileBasename(tempMovie); 
		
		if(BD1_FileExists(local_animatic_file)){//remove o mov se ja existir
			BD1_RemoveFile(local_animatic_file);
		}
		
		var compress = BD1_CompressMovieFile(projData.birdoApp, tempMovie, local_animatic_file);
		if(!compress){
			Print("[COMPRESSANIMATICMOV][ERROR] Fail compressing file: " + tempMovie + " into : " + local_animatic_file);
			return false;
		}
		
		return local_animatic_file;
	}

	function convert_movie_to_image_seq(projectData, movieFile, extension){//converte o aruquivo e retorna o folder com as imagens
		var output = {};
		Print("TESTE movie to convert images: " + movieFile);
		var pos = movieFile.lastIndexOf(".");
		if(pos < 0){
			Print("error: invalid mov file: " + movieFile);
			return null;
		}

		var image_folder = projectData.systemTempFolder + "/" + column.generateAnonymousName()+"/";
		if(!BD1_createDirectoryREDE(image_folder)){
			Print("[CONVERTMOVIE]fail to create image folder!");
			return false;
		}

		var audio_file = image_folder + "Animatic_" + new Date().getTime() + ".wav";
		
		Print("converting movie to image sequence... ");
		var convertImages = BD1_convert_mov_to_images(projectData.birdoApp, movieFile, image_folder, extension);
		
		if(!convertImages){
			Print("Convert mov to image sequence failed!");
			return false;
		} 

		Print("extracting audio from movie... ");

		if(!BD1_extract_audio_from_movieFile(projectData.birdoApp, movieFile, audio_file)){
			Print("Error extracting audio file from movie: " + movieFile);
			return false;
		}
		
		output["image_folder"] = image_folder;
		output["audio_file"] = audio_file;
Print(output);
		return output;

	}

	function getAnimaticMovie(projData, animatic_version){//baixa o animatic no server se houver um mais atual
		
		var pythonPath = BD2_FormatPathOS(projData.birdoApp + "venv/Scripts/python");
		var pyFile = BD2_FormatPathOS(projData.birdoApp + "app/utils/server_get_animatic.py");
		var tempfolder = projData.systemTempFolder + "/BirdoApp/" + projData.server.type + "/update_animatic/";

		if(!BD1_DirExist(tempfolder)){
			BD1_createDirectoryREDE(tempfolder);
		}
		var scene_name = projData["entity"]["name"];
		var jsonFile = tempfolder + "info" + new Date().getTime() + ".json";
		var project_index = projData.id;

		var loadingScreen = BD2_loadingBirdo(projData.birdoApp, 15000, "checking_animatic_on_server...");

		var commands = [];
		commands.push(pythonPath);
		commands.push(pyFile);
		commands.push(scene_name);
		commands.push(animatic_version);
		commands.push(project_index);
		commands.push(jsonFile);
		Print("COMMANDS: ");
		MessageLog.trace(commands);
		var ret = Process.execute(commands);

		if(ret != 0){
			loadingScreen.terminate();
			Print("[GETANIMATICMOVIE][ERROR] Fail to run python script!");
			return false;
		}

		if(loadingScreen.isAlive()){
			Print("closing loading screen...");
			loadingScreen.terminate();
		}
		
		if(BD1_FileExists(jsonFile)){
			var output_data = BD1_ReadJSONFile(jsonFile);
			if(!output_data["animatic"]){
				MessageBox.warning(output_data["satatus"], 0, 0);
				Print(output_data);
				return false;
			}
			if(output_data["animatic"] == "DONT_NEED_UPDATE"){
				MessageBox.information("Current Animatic is already updated!");
				Print("Current animatic is up to date!");
				return false;
			}
			Print(output_data);
			return output_data;
		} else {
			Print("Falha pegar infos do animatic no server!");
			return false;
		}
		
	}
}

exports.UpdateAnimatic = UpdateAnimatic;
